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

    // Get user's company to use default currency if needed
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { company: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const expense = await prisma.expense.create({
      data: {
        amount: parseFloat(amount),
        currency: currency || user.company.currency,
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

    res.status(201).json({
      expense,
      message: "Expense submitted successfully",
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
    const { status, page = "1", pageSize = "10" } = req.query;

    const pageNum = parseInt(page as string, 10) || 1;
    const pageSizeNum = parseInt(pageSize as string, 10) || 10;
    const skip = (pageNum - 1) * pageSizeNum;
    const take = pageSizeNum;

    const whereClause: any = {
      employee_id: userId,
    };

    if (status && typeof status === "string") {
      whereClause.status = status.toUpperCase();
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
        take,
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

    if (
      expense.employee_id !== userId &&
      userRole !== "MANAGER" &&
      userRole !== "ADMIN"
    ) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json({ expense });
  } catch (error) {
    console.error("Error fetching expense:", error);
    res.status(500).json({ error: "Failed to fetch expense" });
  }
});

export default router;
