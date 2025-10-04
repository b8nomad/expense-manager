import express, { type Request, type Response } from "express";
import prisma from "db/client";
import { authMiddleware } from "../middleware";

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Middleware to check if user is ADMIN
function adminOnly(
  req: Request,
  res: Response,
  next: express.NextFunction
) {
  if (req.user_role !== "ADMIN") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

// Apply admin check to all routes
router.use(adminOnly);

// POST /api/approval-flows - Create multi-step approval flow for company
router.post("/", async (req, res) => {
  try {
    const { name, steps, rules } = req.body;
    const userId = req.user_id;

    if (!name || !steps || !Array.isArray(steps) || steps.length === 0) {
      return res
        .status(400)
        .json({ error: "Missing required fields: name and steps" });
    }

    // Get user's company
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { company_id: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Validate steps structure
    for (const step of steps) {
      if (!step.step_order || !step.approver_type || !step.approver_ref) {
        return res.status(400).json({
          error:
            "Each step must have step_order, approver_type, and approver_ref",
        });
      }
      if (!["USER", "ROLE"].includes(step.approver_type)) {
        return res.status(400).json({
          error: "approver_type must be USER or ROLE",
        });
      }
    }

    // Validate rules if provided
    if (rules && Array.isArray(rules)) {
      for (const rule of rules) {
        if (!rule.rule_type || !rule.params) {
          return res.status(400).json({
            error: "Each rule must have rule_type and params",
          });
        }
        if (
          !["PERCENTAGE", "SPECIFIC_APPROVER", "HYBRID"].includes(
            rule.rule_type
          )
        ) {
          return res.status(400).json({
            error: "rule_type must be PERCENTAGE, SPECIFIC_APPROVER, or HYBRID",
          });
        }
      }
    }

    // Create approval flow with steps and rules
    const flow = await prisma.approvalFlow.create({
      data: {
        name,
        company_id: user.company_id,
        is_active: true,
        steps: {
          create: steps.map((step: any) => ({
            step_order: parseInt(step.step_order),
            approver_type: step.approver_type,
            approver_ref: step.approver_ref,
            can_escalate_in: step.can_escalate_in
              ? parseInt(step.can_escalate_in)
              : null,
          })),
        },
        rules:
          rules && Array.isArray(rules)
            ? {
                create: rules.map((rule: any) => ({
                  rule_type: rule.rule_type,
                  params: rule.params,
                })),
              }
            : undefined,
      },
      include: {
        steps: {
          orderBy: {
            step_order: "asc",
          },
        },
        rules: true,
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json({
      flow,
      message: "Approval flow created successfully",
    });
  } catch (error) {
    console.error("Error creating approval flow:", error);
    res.status(500).json({ error: "Failed to create approval flow" });
  }
});

// GET /api/approval-flows/:id - Get flow with steps & rules
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user_id;

    // Get user's company
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { company_id: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const flow = await prisma.approvalFlow.findUnique({
      where: { id },
      include: {
        steps: {
          orderBy: {
            step_order: "asc",
          },
        },
        rules: true,
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!flow) {
      return res.status(404).json({ error: "Approval flow not found" });
    }

    // Ensure flow belongs to user's company
    if (flow.company_id !== user.company_id) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json({ flow });
  } catch (error) {
    console.error("Error fetching approval flow:", error);
    res.status(500).json({ error: "Failed to fetch approval flow" });
  }
});

// GET /api/approval-flows - Get all flows for company
router.get("/", async (req, res) => {
  try {
    const userId = req.user_id;

    // Get user's company
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { company_id: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const flows = await prisma.approvalFlow.findMany({
      where: {
        company_id: user.company_id,
      },
      include: {
        steps: {
          orderBy: {
            step_order: "asc",
          },
        },
        rules: true,
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    res.json({ flows });
  } catch (error) {
    console.error("Error fetching approval flows:", error);
    res.status(500).json({ error: "Failed to fetch approval flows" });
  }
});

// PUT /api/approval-flows/:id - Update flow
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, steps, rules, isActive } = req.body;
    const userId = req.user_id;

    // Get user's company
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { company_id: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if flow exists and belongs to user's company
    const existingFlow = await prisma.approvalFlow.findUnique({
      where: { id },
      select: { company_id: true },
    });

    if (!existingFlow) {
      return res.status(404).json({ error: "Approval flow not found" });
    }

    if (existingFlow.company_id !== user.company_id) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Validate steps if provided
    if (steps && Array.isArray(steps)) {
      for (const step of steps) {
        if (!step.step_order || !step.approver_type || !step.approver_ref) {
          return res.status(400).json({
            error:
              "Each step must have step_order, approver_type, and approver_ref",
          });
        }
        if (!["USER", "ROLE"].includes(step.approver_type)) {
          return res.status(400).json({
            error: "approver_type must be USER or ROLE",
          });
        }
      }
    }

    // Validate rules if provided
    if (rules && Array.isArray(rules)) {
      for (const rule of rules) {
        if (!rule.rule_type || !rule.params) {
          return res.status(400).json({
            error: "Each rule must have rule_type and params",
          });
        }
        if (
          !["PERCENTAGE", "SPECIFIC_APPROVER", "HYBRID"].includes(
            rule.rule_type
          )
        ) {
          return res.status(400).json({
            error: "rule_type must be PERCENTAGE, SPECIFIC_APPROVER, or HYBRID",
          });
        }
      }
    }

    // Build update data
    const updateData: any = {};

    if (name !== undefined) {
      updateData.name = name;
    }

    if (isActive !== undefined) {
      updateData.is_active = isActive;
    }

    // Update flow
    const flow = await prisma.$transaction(async (tx) => {
      // Delete existing steps if new steps are provided
      if (steps && Array.isArray(steps)) {
        await tx.approvalStep.deleteMany({
          where: { flow_id: id },
        });
      }

      // Delete existing rules if new rules are provided
      if (rules && Array.isArray(rules)) {
        await tx.approvalRule.deleteMany({
          where: { flow_id: id },
        });
      }

      // Add new steps and rules to update data
      if (steps && Array.isArray(steps)) {
        updateData.steps = {
          create: steps.map((step: any) => ({
            step_order: parseInt(step.step_order),
            approver_type: step.approver_type,
            approver_ref: step.approver_ref,
            can_escalate_in: step.can_escalate_in
              ? parseInt(step.can_escalate_in)
              : null,
          })),
        };
      }

      if (rules && Array.isArray(rules)) {
        updateData.rules = {
          create: rules.map((rule: any) => ({
            rule_type: rule.rule_type,
            params: rule.params,
          })),
        };
      }

      // Update the flow
      return await tx.approvalFlow.update({
        where: { id },
        data: updateData,
        include: {
          steps: {
            orderBy: {
              step_order: "asc",
            },
          },
          rules: true,
          company: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    });

    res.json({
      flow,
      message: "Approval flow updated successfully",
    });
  } catch (error) {
    console.error("Error updating approval flow:", error);
    res.status(500).json({ error: "Failed to update approval flow" });
  }
});

// DELETE /api/approval-flows/:id - Deactivate flow
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user_id;

    // Get user's company
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { company_id: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if flow exists and belongs to user's company
    const existingFlow = await prisma.approvalFlow.findUnique({
      where: { id },
      select: { company_id: true },
    });

    if (!existingFlow) {
      return res.status(404).json({ error: "Approval flow not found" });
    }

    if (existingFlow.company_id !== user.company_id) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Deactivate the flow (soft delete)
    await prisma.approvalFlow.update({
      where: { id },
      data: { is_active: false },
    });

    res.json({ message: "Approval flow deactivated successfully" });
  } catch (error) {
    console.error("Error deactivating approval flow:", error);
    res.status(500).json({ error: "Failed to deactivate approval flow" });
  }
});

export default router;
