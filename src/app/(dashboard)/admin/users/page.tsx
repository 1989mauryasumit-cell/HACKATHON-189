"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { AdminGuard } from "@/components/admin-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users,
  Mail,
  UserPlus,
  Search,
  Key,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Lock
} from "lucide-react";

interface UserAccount {
  id: string;
  name: string;
  email: string;
  password: string;
  badgeId: string;
  role: string;
  status: "active" | "suspended";
}

const DEFAULT_USERS: UserAccount[] = [
  {
    id: "usr-reach-1",
    name: "Jack Reacher",
    email: "jack.reacher@agency.gov.in",
    password: "password123",
    badgeId: "POL-0084",
    role: "investigator",
    status: "active"
  },
  {
    id: "usr-reach-2",
    name: "Oscar Finlay",
    email: "oscar.finlay@agency.gov.in",
    password: "password123",
    badgeId: "POL-0120",
    role: "supervisor",
    status: "active"
  },
  {
    id: "usr-reach-3",
    name: "Roscoe Conklin",
    email: "roscoe.conklin@agency.gov.in",
    password: "password123",
    badgeId: "POL-0245",
    role: "viewer",
    status: "active"
  },
  {
    id: "usr-admin-1",
    name: "Agent Administrator",
    email: "admin@agency.gov.in",
    password: "password123",
    badgeId: "POL-9999",
    role: "admin",
    status: "active"
  },
  {
    id: "usr-invest-1",
    name: "Agent Investigator",
    email: "investigator@agency.gov.in",
    password: "password123",
    badgeId: "POL-7777",
    role: "investigator",
    status: "active"
  }
];

export default function UserManagementPage() {
  const [users, setUsers] = React.useState<UserAccount[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  
  // New User Form States
  const [newName, setNewName] = React.useState("");
  const [newEmail, setNewEmail] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [newBadge, setNewBadge] = React.useState("");
  const [newRole, setNewRole] = React.useState("investigator");
  const [errorMsg, setErrorMsg] = React.useState("");

  // Load from localStorage or seed defaults with auto-healing format checks
  React.useEffect(() => {
    const saved = localStorage.getItem("kraken_users");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Auto-heal stale cache missing password credentials
        const isStale = parsed.some((u: any) => !u.hasOwnProperty("password"));
        if (isStale) {
          setUsers(DEFAULT_USERS);
          localStorage.setItem("kraken_users", JSON.stringify(DEFAULT_USERS));
        } else {
          setUsers(parsed);
        }
      } catch (e) {
        setUsers(DEFAULT_USERS);
      }
    } else {
      setUsers(DEFAULT_USERS);
      localStorage.setItem("kraken_users", JSON.stringify(DEFAULT_USERS));
    }
  }, []);

  const saveUsers = (updated: UserAccount[]) => {
    setUsers(updated);
    localStorage.setItem("kraken_users", JSON.stringify(updated));
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim() || !newBadge.trim()) {
      setErrorMsg("All credential fields (including Password) are mandatory.");
      return;
    }
    
    if (!newEmail.includes("@") || !newEmail.includes(".")) {
      setErrorMsg("Invalid Email/Mail ID format.");
      return;
    }
    
    if (users.some(u => u.email.toLowerCase() === newEmail.toLowerCase())) {
      setErrorMsg("A user with this Mail ID already exists.");
      return;
    }

    const newUser: UserAccount = {
      id: `usr-${Math.random().toString(36).substr(2, 9)}`,
      name: newName.trim(),
      email: newEmail.trim().toLowerCase(),
      password: newPassword.trim(),
      badgeId: newBadge.trim().toUpperCase(),
      role: newRole,
      status: "active"
    };

    const updatedList = [...users, newUser];
    saveUsers(updatedList);
    
    // Reset Form
    setNewName("");
    setNewEmail("");
    setNewPassword("");
    setNewBadge("");
    setNewRole("investigator");
  };

  const toggleUserStatus = (userId: string) => {
    const updated = users.map(u => {
      if (u.id === userId) {
        return { ...u, status: u.status === "active" ? "suspended" as const : "active" as const };
      }
      return u;
    });
    saveUsers(updated);
  };

  const handleDeleteUser = (userId: string) => {
    if (userId === "usr-admin-1") {
      alert("Cannot revoke primary system administrator accounts.");
      return;
    }
    if (confirm("Are you sure you want to revoke this user's clearance?")) {
      const updated = users.filter(u => u.id !== userId);
      saveUsers(updated);
    }
  };

  const filteredUsers = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return users;
    return users.filter(
      u =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.badgeId.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
    );
  }, [searchQuery, users]);

  return (
    <AdminGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-500" />
            <span>User & Role Management</span>
          </h1>
          <p className="text-muted-foreground">
            Manage investigator credentials, assign security clearance levels, and register operational Mail IDs & Passwords.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Left Column: Register New User Form */}
          <div className="md:col-span-1">
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <UserPlus className="h-4 w-4 text-blue-500" />
                  <span>Register Investigator</span>
                </CardTitle>
                <CardDescription className="text-[10px]">
                  Add a new agent with a designated Mail ID and password.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddUser} className="space-y-4 text-xs">
                  <div className="space-y-1">
                    <label className="font-semibold text-muted-foreground uppercase text-[9px] tracking-wider block">
                      Full Name
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g. Oscar Finlay"
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-muted-foreground uppercase text-[9px] tracking-wider block">
                      Operational Mail ID
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g. finlay@agency.gov.in"
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-muted-foreground uppercase text-[9px] tracking-wider block">
                      Clearance Password
                    </label>
                    <Input
                      type="password"
                      placeholder="Assign temporary password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-muted-foreground uppercase text-[9px] tracking-wider block">
                      Badge Identifier
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g. POL-0120"
                      value={newBadge}
                      onChange={e => setNewBadge(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-muted-foreground uppercase text-[9px] tracking-wider block">
                      Clearance Role
                    </label>
                    <select
                      value={newRole}
                      onChange={e => setNewRole(e.target.value)}
                      className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring text-black dark:text-white"
                    >
                      <option value="viewer" className="text-black bg-white">Viewer</option>
                      <option value="investigator" className="text-black bg-white">Investigator</option>
                      <option value="supervisor" className="text-black bg-white">Supervisor</option>
                      <option value="admin" className="text-black bg-white">Administrator</option>
                    </select>
                  </div>

                  {errorMsg && (
                    <div className="p-2 border border-red-500/20 bg-red-500/10 text-red-500 rounded text-[10px] font-mono">
                      {errorMsg}
                    </div>
                  )}

                  <Button type="submit" size="sm" className="w-full h-8 font-semibold">
                    Confirm Clearance Registration
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: User Directory List */}
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-sm">Clearance Roster Directory</CardTitle>
                  <CardDescription className="text-[10px] mt-1">
                    System administrators can manage user passwords and revoke clearances.
                  </CardDescription>
                </div>
                {/* Search Bar */}
                <div className="relative w-48">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-muted-foreground">
                    <Search className="h-3.5 w-3.5" />
                  </span>
                  <Input
                    type="text"
                    placeholder="Search roster..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="h-7 pl-8 text-xs font-mono"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-muted/40 border-b font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                        <th className="p-3">User & Mail ID</th>
                        <th className="p-3">Badge ID</th>
                        <th className="p-3">Password</th>
                        <th className="p-3">Role</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y font-mono text-[10px]">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-muted-foreground">
                            No credentials matched search parameters.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map(user => (
                          <tr key={user.id} className="hover:bg-muted/10 transition-colors">
                            <td className="p-3">
                              <div className="flex flex-col">
                                <span className="font-bold text-foreground text-xs leading-none">
                                  {user.name}
                                </span>
                                <span className="text-muted-foreground flex items-center gap-1 mt-1 text-[10px]">
                                  <Mail className="h-3 w-3 shrink-0" />
                                  <span>{user.email}</span>
                                </span>
                              </div>
                            </td>
                            <td className="p-3 font-semibold text-foreground">
                              {user.badgeId}
                            </td>
                            <td className="p-3 text-muted-foreground font-mono">
                              <span className="flex items-center gap-1">
                                <Lock className="h-3 w-3" />
                                <span>••••••••</span>
                              </span>
                            </td>
                            <td className="p-3 capitalize">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                                user.role === "admin"
                                  ? "bg-red-500/10 text-red-400 border-red-500/20"
                                  : user.role === "supervisor"
                                  ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                                  : user.role === "investigator"
                                  ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                  : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                              }`}>
                                {user.role}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                                user.status === "active"
                                  ? "bg-green-500/10 text-green-400 border-green-500/20"
                                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              }`}>
                                {user.status}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => toggleUserStatus(user.id)}
                                  title={user.status === "active" ? "Suspend user" : "Activate user"}
                                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                                >
                                  {user.status === "active" ? (
                                    <ToggleRight className="h-5 w-5 text-green-500" />
                                  ) : (
                                    <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(user.id)}
                                  title="Revoke clearance"
                                  className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500"
                                >
                                  <Trash2 className="h-4.5 w-4.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
