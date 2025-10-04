"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { GitBranch, LayoutDashboard, Receipt, Settings, Users } from "lucide-react"
import type { ComponentType, SVGProps } from "react"

import { cn } from "@/lib/utils"

type NavItem = {
	href: string
	label: string
	description?: string
	icon: ComponentType<SVGProps<SVGSVGElement>>
}

const adminNavigation: NavItem[] = [
	{
		href: "/admin",
		label: "Overview",
		description: "Company health at a glance",
		icon: LayoutDashboard,
	},
	{
		href: "/admin/users",
		label: "Team",
		description: "Invite, manage roles, and relationships",
		icon: Users,
	},
	{
		href: "/admin/expenses",
		label: "Expenses",
		description: "Monitor submissions and statuses",
		icon: Receipt,
	},
	{
		href: "/admin/approval-flows",
		label: "Approval flows",
		description: "Design multi-level workflows",
		icon: GitBranch,
	},
	{
		href: "/admin/settings",
		label: "Settings",
		description: "Company profile, currencies, integrations",
		icon: Settings,
	},
]

export function AdminNavigation() {
	const pathname = usePathname()

	return (
		<nav className="space-y-1">
			{adminNavigation.map((item) => {
				const isActive =
					pathname === item.href ||
					(item.href !== "/admin" && pathname.startsWith(`${item.href}/`))
				const Icon = item.icon

				return (
					<Link
						key={item.href}
						href={item.href}
						className={cn(
							"group flex items-center gap-3 rounded-lg px-3 py-2 text-left transition",
							"text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900",
							isActive &&
								"bg-slate-900 text-slate-50 shadow-sm hover:bg-slate-900 hover:text-slate-50"
						)}
					>
						<span
							className={cn(
								"flex h-9 w-9 items-center justify-center rounded-md border border-transparent",
								"bg-slate-100 text-slate-700 group-hover:bg-slate-900/10",
								isActive && "bg-slate-900 text-slate-50"
							)}
						>
							<Icon className="h-4 w-4" aria-hidden="true" />
						</span>
						<span className="flex flex-col">
							<span className="font-medium leading-tight">{item.label}</span>
							{item.description ? (
								<span className="text-xs text-slate-500 group-hover:text-slate-600">
									{item.description}
								</span>
							) : null}
						</span>
					</Link>
				)
			})}
		</nav>
	)
}

export default AdminNavigation
