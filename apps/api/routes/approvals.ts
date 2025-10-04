import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import prisma from "db/client";
import { authMiddleware } from "../middleware";

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Middleware to check if user is MANAGER or ADMIN
function managerOrAdminOnly(req: Request, res: Response, next: NextFunction) {
  if (req.user_role !== "MANAGER" && req.user_role !== "ADMIN") {
    return res.status(403).json({ error: "Manager or Admin access required" });
  }
  next();
}

// Middleware to check if user is ADMIN
function adminOnly(req: Request, res: Response, next: NextFunction) {
  if (req.user_role !== "ADMIN") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

// GET /api/approvals/pending - List pending approvals for logged-in manager/admin
router.get("/pending", managerOrAdminOnly, async (req, res) => {
  try {
    const userId = req.user_id;
    const userRole = req.user_role;
    const { page = "1", pageSize = "10", sort = "createdAt" } = req.query;

    const pageNum = parseInt(page as string, 10) || 1;
    const pageSizeNum = parseInt(pageSize as string, 10) || 10;
    const skip = (pageNum - 1) * pageSizeNum;
    const take = pageSizeNum;

    // Build where clause to find approvals assigned to this user
    // Either directly (USER type) or by role (ROLE type)
    const whereClause: any = {
      status: "PENDING",
      OR: [
        {
          // Direct assignment
          approver_id: userId,
        },
        {
          // Role-based assignment
          step: {
            approver_type: "ROLE",
            approver_ref: userRole,
          },
        },
      ],
    };

    const [approvals, total] = await Promise.all([
      prisma.approval.findMany({
        where: whereClause,
        include: {
          expense: {
            include: {
              employee: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          step: true,
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
          [sort as string]: "desc",
        },
        skip,
        take,
      }),
      prisma.approval.count({
        where: whereClause,
      }),
    ]);

    // Transform response to match the specified format
    const formattedApprovals = approvals.map((approval) => ({
      approvalId: approval.id,
      expenseId: approval.expense_id,
      employee: approval.expense.employee,
      amount: approval.expense.amount,
      currency: approval.expense.currency,
      category: approval.expense.category,
      description: approval.expense.description,
      date: approval.expense.date,
      step_order: approval.step?.step_order,
      approver_type: approval.step?.approver_type,
      approver_ref: approval.step?.approver_ref,
      createdAt: approval.expense.createdAt,
    }));

    res.json({
      approvals: formattedApprovals,
      pagination: {
        page: pageNum,
        pageSize: pageSizeNum,
        total,
        totalPages: Math.ceil(total / pageSizeNum),
      },
    });
  } catch (error) {
    console.error("Error fetching pending approvals:", error);
    res.status(500).json({ error: "Failed to fetch pending approvals" });
  }
});

// GET /api/approvals/:expenseId - Get all approvals for an expense
router.get("/:expenseId", async (req, res) => {
  try {
    const { expenseId } = req.params;
    const userId = req.user_id;
    const userRole = req.user_role;

    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
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

    // Check access: employee can view own, managers/admins can view if assigned
    const isOwnExpense = expense.employee_id === userId;
    const isAssignedApprover = expense.approvals.some(
      (approval) =>
        approval.approver_id === userId ||
        (approval.step?.approver_type === "ROLE" &&
          approval.step?.approver_ref === userRole)
    );

    if (!isOwnExpense && !isAssignedApprover && userRole !== "ADMIN") {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json({ expense });
  } catch (error) {
    console.error("Error fetching expense approvals:", error);
    res.status(500).json({ error: "Failed to fetch expense approvals" });
  }
});

// POST /api/approvals/:expenseId/approve - Approve current step
router.post("/:expenseId/approve", managerOrAdminOnly, async (req, res) => {
  try {
    const { expenseId } = req.params;
    const { comments } = req.body;
    const userId = req.user_id;
    const userRole = req.user_role;

    // Use transaction to prevent race conditions
    const result = await prisma.$transaction(async (tx) => {
      // Get expense with current step and approvals
      const expense = await tx.expense.findUnique({
        where: { id: expenseId },
        include: {
          current_step: true,
          approvals: {
            where: { status: "PENDING" },
            include: { step: true },
          },
          employee: {
            include: { company: true },
          },
        },
      });

      if (!expense) {
        throw new Error("Expense not found");
      }

      if (expense.status !== "PENDING") {
        throw new Error("Expense is not pending approval");
      }

      // Find the approval record for current user at current step
      const currentApproval = expense.approvals.find(
        (approval) =>
          approval.step_id === expense.current_step_id &&
          (approval.approver_id === userId ||
            (approval.step?.approver_type === "ROLE" &&
              approval.step?.approver_ref === userRole))
      );

      if (!currentApproval) {
        throw new Error("You are not authorized to approve this step");
      }

      // Update the approval record
      await tx.approval.update({
        where: { id: currentApproval.id },
        data: {
          status: "APPROVED",
          comments: comments || null,
          decided_at: new Date(),
          approver_id: userId, // Set actual approver if role-based
        },
      });

      // Get all steps for this expense's flow
      const allSteps = await tx.approvalStep.findMany({
        where: { flow_id: expense.current_step!.flow_id },
        orderBy: { step_order: "asc" },
      });

      // Check if there are more steps
      const currentStepOrder = expense.current_step!.step_order;
      const nextStep = allSteps.find(
        (step) => step.step_order > currentStepOrder
      );

      let newExpenseStatus: "PENDING" | "APPROVED" | "REJECTED" =
        expense.status;
      let newCurrentStepId = expense.current_step_id;

      if (nextStep) {
        // Move to next step
        newCurrentStepId = nextStep.id;

        // Create approval records for next step
        if (nextStep.approver_type === "USER") {
          // Create approval for specific user
          await tx.approval.create({
            data: {
              expense: { connect: { id: expenseId } },
              step: { connect: { id: nextStep.id } },
              approver: { connect: { id: nextStep.approver_ref } },
              status: "PENDING",
            },
          });
        } else if (nextStep.approver_type === "ROLE") {
          // Create approval for role (approver_id will be set when someone approves)
          // For now, we'll use a placeholder or the first user with that role
          const roleUser = await tx.user.findFirst({
            where: {
              role: nextStep.approver_ref as any,
              company_id: expense.employee.company_id,
            },
          });

          if (roleUser) {
            await tx.approval.create({
              data: {
                expense: { connect: { id: expenseId } },
                step: { connect: { id: nextStep.id } },
                approver: { connect: { id: roleUser.id } },
                status: "PENDING",
              },
            });
          }
        }
      } else {
        // No more steps - expense is fully approved
        newExpenseStatus = "APPROVED";
        newCurrentStepId = null;
      }

      // Check approval rules to see if we can skip steps or auto-approve
      const approvalRules = await tx.approvalRule.findMany({
        where: { flow_id: expense.current_step!.flow_id },
      });

      for (const rule of approvalRules) {
        if (rule.rule_type === "PERCENTAGE") {
          // Example: if amount is below certain percentage, auto-approve
          const params = rule.params as any;
          const threshold = params.threshold || 0;
          if (expense.amount < threshold) {
            newExpenseStatus = "APPROVED";
            newCurrentStepId = null;
          }
        } else if (rule.rule_type === "SPECIFIC_APPROVER") {
          // Example: if specific approver approves, skip remaining steps
          const params = rule.params as any;
          if (params.approver_id === userId && params.skip_remaining) {
            newExpenseStatus = "APPROVED";
            newCurrentStepId = null;
          }
        }
        // Add more rule types as needed
      }

      // Update expense
      const updatedExpense = await tx.expense.update({
        where: { id: expenseId },
        data: {
          status: newExpenseStatus,
          current_step_id: newCurrentStepId,
        },
      });

      return updatedExpense;
    });

    res.json({
      expenseId,
      status: result.status,
      message:
        result.status === "APPROVED"
          ? "Expense fully approved"
          : "Step approved successfully",
    });
  } catch (error: any) {
    console.error("Error approving expense:", error);
    res
      .status(400)
      .json({ error: error.message || "Failed to approve expense" });
  }
});

// POST /api/approvals/:expenseId/reject - Reject current step
router.post("/:expenseId/reject", managerOrAdminOnly, async (req, res) => {
  try {
    const { expenseId } = req.params;
    const { comments } = req.body;
    const userId = req.user_id;
    const userRole = req.user_role;

    // Use transaction to prevent race conditions
    const result = await prisma.$transaction(async (tx) => {
      // Get expense with current step and approvals
      const expense = await tx.expense.findUnique({
        where: { id: expenseId },
        include: {
          current_step: true,
          approvals: {
            where: { status: "PENDING" },
            include: { step: true },
          },
        },
      });

      if (!expense) {
        throw new Error("Expense not found");
      }

      if (expense.status !== "PENDING") {
        throw new Error("Expense is not pending approval");
      }

      // Find the approval record for current user at current step
      const currentApproval = expense.approvals.find(
        (approval) =>
          approval.step_id === expense.current_step_id &&
          (approval.approver_id === userId ||
            (approval.step?.approver_type === "ROLE" &&
              approval.step?.approver_ref === userRole))
      );

      if (!currentApproval) {
        throw new Error("You are not authorized to reject this step");
      }

      // Update the approval record
      await tx.approval.update({
        where: { id: currentApproval.id },
        data: {
          status: "REJECTED",
          comments: comments || null,
          decided_at: new Date(),
          approver_id: userId, // Set actual approver if role-based
        },
      });

      // Update expense status to REJECTED
      const updatedExpense = await tx.expense.update({
        where: { id: expenseId },
        data: {
          status: "REJECTED",
          current_step_id: null,
        },
      });

      return updatedExpense;
    });

    res.json({
      expenseId,
      status: result.status,
      message: "Expense rejected",
    });
  } catch (error: any) {
    console.error("Error rejecting expense:", error);
    res
      .status(400)
      .json({ error: error.message || "Failed to reject expense" });
  }
});

// POST /api/approvals/:expenseId/escalate - Escalate step (admin/system only)
router.post("/:expenseId/escalate", adminOnly, async (req, res) => {
  try {
    const { expenseId } = req.params;
    const { stepId } = req.body;
    const userId = req.user_id;

    const result = await prisma.$transaction(async (tx) => {
      // Get expense with current step
      const expense = await tx.expense.findUnique({
        where: { id: expenseId },
        include: {
          current_step: {
            include: { flow: true },
          },
          employee: {
            include: { company: true },
          },
        },
      });

      if (!expense) {
        throw new Error("Expense not found");
      }

      if (expense.status !== "PENDING") {
        throw new Error("Expense is not pending approval");
      }

      const targetStepId = stepId || expense.current_step_id;

      // Get current step details
      const currentStep = await tx.approvalStep.findUnique({
        where: { id: targetStepId! },
      });

      if (!currentStep) {
        throw new Error("Step not found");
      }

      // Find next step in sequence
      const nextStep = await tx.approvalStep.findFirst({
        where: {
          flow_id: currentStep.flow_id,
          step_order: { gt: currentStep.step_order },
        },
        orderBy: { step_order: "asc" },
      });

      if (!nextStep) {
        // No next step - escalate to admin or final approver
        const admin = await tx.user.findFirst({
          where: {
            role: "ADMIN",
            company_id: expense.employee.company_id,
            id: { not: userId }, // Not the current admin
          },
        });

        if (admin) {
          // Create new approval for admin
          await tx.approval.create({
            data: {
              expense: { connect: { id: expenseId } },
              step: { connect: { id: currentStep.id } },
              approver: { connect: { id: admin.id } },
              status: "PENDING",
              comments: "Escalated by admin",
            },
          });
        }

        throw new Error("No next step available for escalation");
      }

      // Update current pending approval to escalated (we'll mark as rejected with comment)
      await tx.approval.updateMany({
        where: {
          expense_id: expenseId,
          step_id: targetStepId!,
          status: "PENDING",
        },
        data: {
          status: "REJECTED",
          comments: "Escalated to next step",
          decided_at: new Date(),
        },
      });

      // Move to next step
      await tx.expense.update({
        where: { id: expenseId },
        data: {
          current_step_id: nextStep.id,
        },
      });

      // Create approval for next step
      if (nextStep.approver_type === "USER") {
        await tx.approval.create({
          data: {
            expense: { connect: { id: expenseId } },
            step: { connect: { id: nextStep.id } },
            approver: { connect: { id: nextStep.approver_ref } },
            status: "PENDING",
          },
        });
      } else if (nextStep.approver_type === "ROLE") {
        const roleUser = await tx.user.findFirst({
          where: {
            role: nextStep.approver_ref as any,
            company_id: expense.employee.company_id,
          },
        });

        if (roleUser) {
          await tx.approval.create({
            data: {
              expense: { connect: { id: expenseId } },
              step: { connect: { id: nextStep.id } },
              approver: { connect: { id: roleUser.id } },
              status: "PENDING",
            },
          });
        }
      }

      return { expenseId, nextStep };
    });

    res.json({
      expenseId: result.expenseId,
      message: "Step escalated to next approver",
    });
  } catch (error: any) {
    console.error("Error escalating approval:", error);
    res
      .status(400)
      .json({ error: error.message || "Failed to escalate approval" });
  }
});

export default router;
