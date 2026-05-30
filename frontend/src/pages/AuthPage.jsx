import { useState } from "react";
import { login, register } from "../api/auth";
import { Button } from "../components/Button.jsx";
import { Card } from "../components/Card.jsx";
import { Input } from "../components/Input.jsx";

export function AuthPage({ onAuthed }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("User");
  const [accessKey, setAccessKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let data;
      if (isLogin) {
        data = await login(email, password);
      } else {
        data = await register(email, password, role, accessKey);
      }
      onAuthed(data);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "auth_failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md p-8">
        <h2 className="mb-6 text-2xl font-bold text-slate-100">
          {isLogin ? "Sign In" : "Create Account"}
        </h2>

        {error && (
          <div className="mb-4 rounded-md border border-rose-900 bg-rose-950/40 p-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-400">Email Address</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-400">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {!isLogin && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-400">Role</label>
                <select
                  className="w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="User">User</option>
                  <option value="Manager">Manager</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>

              {(role === "Admin" || role === "Manager") && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-400">
                    Access Key
                  </label>
                  <Input
                    type="password"
                    value={accessKey}
                    onChange={(e) => setAccessKey(e.target.value)}
                    placeholder="Enter special access key"
                    required
                  />
                </div>
              )}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Please wait..." : isLogin ? "Sign In" : "Sign Up"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-slate-400">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
          </span>{" "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="font-medium text-sky-400 hover:text-sky-300"
          >
            {isLogin ? "Sign Up" : "Sign In"}
          </button>
        </div>
      </Card>
    </div>
  );
}
