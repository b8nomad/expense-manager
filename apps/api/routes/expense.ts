import express from "express";
import prisma from "db/client";
import { authMiddleware } from "../middleware";

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// POST /api/expenses - Submit a new expense
router.post("/", async (req, res) => {
  try {
    const { amount, currency, category, description, date } = req.body;
    const userId = req.user_id;

    if (!amount || !currency || !category || !description) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate amount
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: "Amount must be a positive number" });
    }

    // Get user's company and check if user has a manager
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        company: true,
        manager: {
          select: {
            id: true,
            is_manager_approver: true,
          }
        }
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get active approval flows for the company
    const activeFlows = await prisma.approvalFlow.findMany({
      where: {
        company_id: user.company_id,
        is_active: true,
      },
      include: {
        steps: {
          orderBy: {
            step_order: "asc",
          },
        },
      },
    });

    // Create the expense
    const expense = await prisma.expense.create({
      data: {
        amount: parsedAmount,
        currency: currency.toUpperCase(),
        category,
        description,
        date: date ? new Date(date) : new Date(),
        employee_id: userId!,
        status: "PENDING",
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Create approval requests based on the flow
    if (activeFlows.length > 0) {
      const flow = activeFlows[0]; // Use first active flow
      
      // Check if employee has a manager with is_manager_approver = true
      if (user.manager && user.manager.is_manager_approver) {
        // Create manager approval first
        await prisma.approval.create({
          data: {
            expense_id: expense.id,
            approver_id: user.manager.id,
            status: "PENDING",
          },
        });
      }
      
      // Create approvals for each step in the flow
      for (const step of flow.steps) {
        let approverId: string | null = null;

        if (step.approver_type === "USER") {
          // Specific user
          approverId = step.approver_ref;
        } else if (step.approver_type === "ROLE") {
          // Find a user with the specified role in the company
          const roleUser = await prisma.user.findFirst({
            where: {
              company_id: user.company_id,
              role: step.approver_ref as any,
            },
          });
          if (roleUser) {
            approverId = roleUser.id;
          }
        }

        if (approverId && approverId !== userId) {
          await prisma.approval.create({
            data: {
              expense_id: expense.id,
              approver_id: approverId,
              step_id: step.id,
              status: "PENDING",
            },
          });
        }
      }

      // Set current step to first step
      if (flow.steps.length > 0) {
        await prisma.expense.update({
          where: { id: expense.id },
          data: { current_step_id: flow.steps[0].id },
        });
      }
    }

    res.status(201).json({
      expense,
      message: "Expense submitted successfully and sent for approval",
    });
  } catch (error) {
    console.error("Error creating expense:", error);
    res.status(500).json({ error: "Failed to create expense" });
  }
});

// GET /api/expenses - List expenses with optional filters and pagination
router.get("/", async (req, res) => {
  try {
    const userId = req.user_id;
    const { status, page = "1", pageSize = "10", search, category } = req.query;

    const pageNum = Math.max(parseInt(page as string, 10) || 1, 1);
    const pageSizeNum = Math.min(Math.max(parseInt(pageSize as string, 10) || 10, 1), 100);
    const skip = (pageNum - 1) * pageSizeNum;

    const whereClause: any = {
      employee_id: userId,
    };

    // Status filter
    if (status && typeof status === "string" && status.toUpperCase() !== "ALL") {
      whereClause.status = status.toUpperCase();
    }

    // Category filter
    if (category && typeof category === "string" && category !== "all") {
      whereClause.category = category;
    }

    // Search filter
    if (search && typeof search === "string" && search.trim().length > 0) {
      whereClause.OR = [
        {
          description: {
            contains: search.trim(),
            mode: "insensitive",
          },
        },
        {
          category: {
            contains: search.trim(),
            mode: "insensitive",
          },
        },
      ];
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where: whereClause,
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          approvals: {
            include: {
              approver: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              },
              step: true,
            },
            orderBy: {
              decided_at: "asc",
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: pageSizeNum,
      }),
      prisma.expense.count({
        where: whereClause,
      }),
    ]);

    res.json({
      expenses,
      pagination: {
        page: pageNum,
        pageSize: pageSizeNum,
        total,
        totalPages: Math.ceil(total / pageSizeNum),
      },
    });
  } catch (error) {
    console.error("Error fetching expenses:", error);
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
});

// GET /api/expenses/stats - Get expense statistics for employee
router.get("/stats", async (req, res) => {
  try {
    const userId = req.user_id;

    const [total, pending, approved, rejected, totalAmount] = await Promise.all([
      prisma.expense.count({ where: { employee_id: userId } }),
      prisma.expense.count({ where: { employee_id: userId, status: "PENDING" } }),
      prisma.expense.count({ where: { employee_id: userId, status: "APPROVED" } }),
      prisma.expense.count({ where: { employee_id: userId, status: "REJECTED" } }),
      prisma.expense.aggregate({
        where: { employee_id: userId, status: "APPROVED" },
        _sum: { amount: true },
      }),
    ]);

    res.json({
      total,
      pending,
      approved,
      rejected,
      totalAmount: totalAmount._sum.amount || 0,
    });
  } catch (error) {
    console.error("Error fetching expense stats:", error);
    res.status(500).json({ error: "Failed to fetch expense stats" });
  }
});

// GET /api/expenses/:id - View a single expense with approval details
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user_id;
    const userRole = req.user_role;

    const expense = await prisma.expense.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        approvals: {
          include: {
            approver: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
            step: true,
          },
          orderBy: {
            decided_at: "asc",
          },
        },
        current_step: true,
      },
    });

    if (!expense) {
      return res.status(404).json({ error: "Expense not found" });
    }

    // Access control: employees can only view their own expenses
    // Managers and admins can view all expenses
    if (userRole === "EMPLOYEE" && expense.employee_id !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(expense);
  } catch (error) {
    console.error("Error fetching expense:", error);
    res.status(500).json({ error: "Failed to fetch expense" });
  }
});

export default router;
