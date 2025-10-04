import express, { type NextFunction, type Request, type Response } from "express"
import prisma from "db/client"

import { authMiddleware } from "../middleware"

const router = express.Router()

router.use(authMiddleware)

function adminOnly(req: Request, res: Response, next: NextFunction) {
  if (req.user_role !== "ADMIN") {
    return res.status(403).json({ error: "Admin access required" })
  }
  next()
}

router.use(adminOnly)

async function getCompanyContext(userId: string | undefined) {
  if (!userId) {
    throw new Error("Missing user id")
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      company_id: true,
      company: {
        select: {
          id: true,
          name: true,
          currency: true,
          country: true,
          createdAt: true,
        },
      },
    },
  })

  if (!user || !user.company) {
    throw new Error("Company not found for user")
  }

  return { companyId: user.company_id, company: user.company }
}

router.get("/dashboard", async (req, res) => {
  try {
    const { companyId, company } = await getCompanyContext(req.user_id)

    const startOfMonth = new Date()
    startOfMonth.setUTCHours(0, 0, 0, 0)
    startOfMonth.setUTCDate(1)

    const baseApprovalFilter = {
      status: "PENDING" as const,
      expense: {
        employee: {
          company_id: companyId,
        },
      },
    }

    const [
      pendingCount,
      managerQueueCount,
      adminQueueCount,
      reimbursementAggregate,
      activeApproversCount,
      totalFlows,
      flowsWithRules,
      totalUsers,
      pendingApprovals,
    ] = await Promise.all([
      prisma.approval.count({
        where: baseApprovalFilter,
      }),
      prisma.approval.count({
        where: {
          ...baseApprovalFilter,
          OR: [
            {
              approver: {
                role: "MANAGER",
              },
            },
            {
              step: {
                approver_type: "ROLE",
                approver_ref: "MANAGER",
              },
            },
          ],
        },
      }),
      prisma.approval.count({
        where: {
          ...baseApprovalFilter,
          OR: [
            {
              approver: {
                role: "ADMIN",
              },
            },
            {
              step: {
                approver_type: "ROLE",
                approver_ref: "ADMIN",
              },
            },
          ],
        },
      }),
      prisma.expense.aggregate({
        where: {
          employee: {
            company_id: companyId,
          },
          status: "APPROVED",
          date: {
            gte: startOfMonth,
          },
        },
        _sum: {
          amount_converted: true,
          amount: true,
        },
      }),
      prisma.user.count({
        where: {
          company_id: companyId,
          OR: [
            {
              role: {
                in: ["MANAGER", "ADMIN"],
              },
            },
            {
              is_manager_approver: true,
            },
          ],
        },
      }),
      prisma.approvalFlow.count({
        where: {
          company_id: companyId,
        },
      }),
      prisma.approvalFlow.count({
        where: {
          company_id: companyId,
          rules: {
            some: {},
          },
        },
      }),
      prisma.user.count({
        where: {
          company_id: companyId,
        },
      }),
      prisma.approval.findMany({
        where: baseApprovalFilter,
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
        },
        orderBy: [
          {
            expense: {
              createdAt: "desc",
            },
          },
        ],
        take: 10,
      }),
    ])

    const reimbursementTotal =
      reimbursementAggregate._sum.amount_converted ??
      reimbursementAggregate._sum.amount ??
      0

    const automationCoverage =
      totalFlows === 0 ? 0 : Math.round((flowsWithRules / totalFlows) * 100)

    res.json({
      company: {
        ...company,
        createdAt: company.createdAt?.toISOString() ?? null,
      },
      stats: {
        pendingExpenses: pendingCount,
        managerQueue: managerQueueCount,
        adminQueue: adminQueueCount,
        reimbursementsThisMonth: {
          total: Number(reimbursementTotal ?? 0),
          currency: company.currency,
        },
        activeApprovers: activeApproversCount,
        automationCoverage,
      },
      onboarding: {
        hasTeam: totalUsers > 1,
        hasFlows: totalFlows > 0,
        hasCompanyProfile: Boolean(company.currency && company.country),
      },
      pendingApprovals: pendingApprovals.map((approval) => ({
        id: approval.id,
        expenseId: approval.expense_id,
        employee: approval.expense.employee?.name ?? "Unknown",
        employeeEmail: approval.expense.employee?.email ?? null,
        category: approval.expense.category,
        amount: approval.expense.amount,
        currency: approval.expense.currency,
        amountConverted: approval.expense.amount_converted,
        submittedAt: approval.expense.date.toISOString(),
        status: approval.expense.status,
        stepOrder: approval.step?.step_order ?? null,
        approverType: approval.step?.approver_type ?? null,
        approverRef: approval.step?.approver_ref ?? null,
      })),
    })
  } catch (error) {
    console.error("Error loading admin dashboard", error)
    res.status(500).json({ error: "Failed to load admin dashboard" })
  }
})

router.get("/users", async (req, res) => {
  try {
    const { companyId } = await getCompanyContext(req.user_id)
    const { role, search } = req.query

    const where: any = { company_id: companyId }

    // Role filter
    if (role && typeof role === "string" && role.toUpperCase() !== "ALL") {
      where.role = role.toUpperCase()
    }

    // Search filter
    if (search && typeof search === "string" && search.trim().length > 0) {
      where.OR = [
        {
          name: {
            contains: search.trim(),
            mode: "insensitive",
          },
        },
        {
          email: {
            contains: search.trim(),
            mode: "insensitive",
          },
        },
      ]
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    })

    res.json({
      users: users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        manager: user.manager
          ? {
              id: user.manager.id,
              name: user.manager.name,
              email: user.manager.email,
            }
          : null,
        isManagerApprover: user.is_manager_approver,
      })),
    })
  } catch (error) {
    console.error("Error fetching admin users", error)
    res.status(500).json({ error: "Failed to fetch users" })
  }
})

router.get("/expenses", async (req, res) => {
  try {
    const { companyId } = await getCompanyContext(req.user_id)
    const { 
      status, 
      page = "1", 
      pageSize = "20",
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query

    const pageNumber = Math.max(parseInt(page as string, 10) || 1, 1)
    const pageSizeNumber = Math.min(Math.max(parseInt(pageSize as string, 10) || 20, 1), 100)

    const where: any = {
      employee: {
        company_id: companyId,
      },
    }

    // Status filter
    if (status && typeof status === "string" && status.toUpperCase() !== "ALL") {
      where.status = status.toUpperCase()
    }

    // Search filter
    if (search && typeof search === "string" && search.trim().length > 0) {
      where.OR = [
        {
          employee: {
            name: {
              contains: search.trim(),
              mode: "insensitive",
            },
          },
        },
        {
          employee: {
            email: {
              contains: search.trim(),
              mode: "insensitive",
            },
          },
        },
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
      ]
    }

    // Determine sort field
    const validSortFields = ["createdAt", "date", "amount", "status", "category"]
    const sortField = validSortFields.includes(sortBy as string) ? sortBy as string : "createdAt"
    const sortDirection = sortOrder === "asc" ? "asc" : "desc"

    const orderBy: any = {}
    if (sortField === "date") {
      orderBy.date = sortDirection
    } else if (sortField === "amount") {
      orderBy.amount = sortDirection
    } else if (sortField === "status") {
      orderBy.status = sortDirection
    } else if (sortField === "category") {
      orderBy.category = sortDirection
    } else {
      orderBy.createdAt = sortDirection
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy,
        skip: (pageNumber - 1) * pageSizeNumber,
        take: pageSizeNumber,
      }),
      prisma.expense.count({ where }),
    ])

    res.json({
      expenses: expenses.map((expense) => ({
        id: expense.id,
        employee: expense.employee?.name ?? "Unknown",
        employeeEmail: expense.employee?.email ?? null,
        employeeId: expense.employee?.id ?? null,
        description: expense.description,
        category: expense.category,
        amount: expense.amount,
        currency: expense.currency,
        amountConverted: expense.amount_converted,
        status: expense.status,
        submittedAt: expense.date.toISOString(),
        createdAt: expense.createdAt.toISOString(),
      })),
      pagination: {
        page: pageNumber,
        pageSize: pageSizeNumber,
        total,
        totalPages: Math.ceil(total / pageSizeNumber),
      },
    })
  } catch (error) {
    console.error("Error fetching admin expenses", error)
    res.status(500).json({ error: "Failed to fetch expenses" })
  }
})

router.get("/company", async (req, res) => {
  try {
    const { companyId } = await getCompanyContext(req.user_id)

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        country: true,
        currency: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            flows: true,
          },
        },
      },
    })

    if (!company) {
      return res.status(404).json({ error: "Company not found" })
    }

    res.json({
      company: {
        id: company.id,
        name: company.name,
        country: company.country,
        currency: company.currency,
        createdAt: company.createdAt.toISOString(),
        members: company._count.users,
        approvalFlows: company._count.flows,
      },
    })
  } catch (error) {
    console.error("Error fetching company profile", error)
    res.status(500).json({ error: "Failed to fetch company profile" })
  }
})

router.put("/company", async (req, res) => {
  try {
    const { companyId } = await getCompanyContext(req.user_id)
    const { name, country, currency } = req.body

    // Validate input
    const updateData: any = {}

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({ error: "Company name must be a non-empty string" })
      }
      updateData.name = name.trim()
    }

    if (country !== undefined) {
      if (typeof country !== "string" || country.trim().length === 0) {
        return res.status(400).json({ error: "Country must be a non-empty string" })
      }
      updateData.country = country.trim()
    }

    if (currency !== undefined) {
      if (typeof currency !== "string" || currency.trim().length === 0) {
        return res.status(400).json({ error: "Currency must be a non-empty string" })
      }
      // Validate currency code format (should be 3 uppercase letters)
      const currencyCode = currency.trim().toUpperCase()
      if (!/^[A-Z]{3}$/.test(currencyCode)) {
        return res.status(400).json({ error: "Currency must be a valid 3-letter code (e.g., USD)" })
      }
      updateData.currency = currencyCode
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" })
    }

    // Update company
    const updatedCompany = await prisma.company.update({
      where: { id: companyId },
      data: updateData,
      select: {
        id: true,
        name: true,
        country: true,
        currency: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            flows: true,
          },
        },
      },
    })

    res.json({
      company: {
        id: updatedCompany.id,
        name: updatedCompany.name,
        country: updatedCompany.country,
        currency: updatedCompany.currency,
        createdAt: updatedCompany.createdAt.toISOString(),
        members: updatedCompany._count.users,
        approvalFlows: updatedCompany._count.flows,
      },
      message: "Company settings updated successfully",
    })
  } catch (error) {
    console.error("Error updating company profile", error)
    res.status(500).json({ error: "Failed to update company profile" })
  }
})

router.post("/users", async (req, res) => {
  try {
    const { companyId } = await getCompanyContext(req.user_id)
    const { name, email, role, managerId, password } = req.body

    if (!name || !email || !role) {
      return res.status(400).json({ error: "Name, email, and role are required" })
    }

    const validRoles = ["EMPLOYEE", "MANAGER", "ADMIN"]
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: "Invalid role. Must be EMPLOYEE, MANAGER, or ADMIN" })
    }

    // Check if user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return res.status(409).json({ error: "User with this email already exists" })
    }

    // Verify manager exists if provided
    if (managerId) {
      const manager = await prisma.user.findFirst({
        where: {
          id: managerId,
          company_id: companyId,
        },
      })

      if (!manager) {
        return res.status(404).json({ error: "Manager not found in this company" })
      }
    }

    // Hash password or generate a default one
    const { hashPassword } = require("../utils/hash")
    const hashedPassword = password ? await hashPassword(password) : await hashPassword("changeme123")

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        company_id: companyId,
        manager_id: managerId || null,
        is_manager_approver: role === "MANAGER",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        is_manager_approver: true,
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    res.status(201).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        manager: user.manager,
        isManagerApprover: user.is_manager_approver,
      },
      message: "User created successfully",
    })
  } catch (error) {
    console.error("Error creating user", error)
    res.status(500).json({ error: "Failed to create user" })
  }
})

router.put("/users/:userId", async (req, res) => {
  try {
    const { companyId } = await getCompanyContext(req.user_id)
    const { userId } = req.params
    const { name, email, role, managerId, password } = req.body

    if (!name || !email || !role) {
      return res.status(400).json({ error: "Name, email, and role are required" })
    }

    const validRoles = ["EMPLOYEE", "MANAGER", "ADMIN"]
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: "Invalid role. Must be EMPLOYEE, MANAGER, or ADMIN" })
    }

    // Check if user exists and belongs to the same company
    const existingUser = await prisma.user.findFirst({
      where: {
        id: userId,
        company_id: companyId,
      },
    })

    if (!existingUser) {
      return res.status(404).json({ error: "User not found in this company" })
    }

    // Check if email is taken by another user
    if (email !== existingUser.email) {
      const emailTaken = await prisma.user.findUnique({
        where: { email },
      })

      if (emailTaken) {
        return res.status(409).json({ error: "Email already in use by another user" })
      }
    }

    // Verify manager exists if provided
    if (managerId && managerId !== userId) {
      const manager = await prisma.user.findFirst({
        where: {
          id: managerId,
          company_id: companyId,
        },
      })

      if (!manager) {
        return res.status(404).json({ error: "Manager not found in this company" })
      }
    }

    // Prepare update data
    const updateData: any = {
      name,
      email,
      role,
      manager_id: managerId && managerId !== userId ? managerId : null,
      is_manager_approver: role === "MANAGER",
    }

    // Only update password if provided
    if (password) {
      const { hashPassword } = require("../utils/hash")
      updateData.password = await hashPassword(password)
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        is_manager_approver: true,
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    res.json({
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        manager: updatedUser.manager,
        isManagerApprover: updatedUser.is_manager_approver,
      },
      message: "User updated successfully",
    })
  } catch (error) {
    console.error("Error updating user", error)
    res.status(500).json({ error: "Failed to update user" })
  }
})

router.delete("/users/:userId", async (req, res) => {
  try {
    const { companyId } = await getCompanyContext(req.user_id)
    const { userId } = req.params

    // Check if user exists and belongs to the same company
    const existingUser = await prisma.user.findFirst({
      where: {
        id: userId,
        company_id: companyId,
      },
    })

    if (!existingUser) {
      return res.status(404).json({ error: "User not found in this company" })
    }

    // Prevent admin from deleting themselves
    if (userId === req.user_id) {
      return res.status(400).json({ error: "You cannot delete your own account" })
    }

    // Check if user has any related data that would prevent deletion
    const [expenseCount, approvalCount] = await Promise.all([
      prisma.expense.count({
        where: { employee_id: userId },
      }),
      prisma.approval.count({
        where: { approver_id: userId },
      }),
    ])

    if (expenseCount > 0 || approvalCount > 0) {
      return res.status(400).json({
        error: `Cannot delete user. They have ${expenseCount} expense(s) and ${approvalCount} approval(s) in the system. Consider deactivating instead.`,
      })
    }

    // Delete the user
    await prisma.user.delete({
      where: { id: userId },
    })

    res.json({
      message: "User deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting user", error)
    res.status(500).json({ error: "Failed to delete user" })
  }
})

export default router
