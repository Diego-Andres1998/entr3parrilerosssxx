import React, { useState } from "react";
import { Lock, Eye, EyeOff, ShieldAlert, KeyRound } from "lucide-react";
import { motion } from "motion/react";

interface AdminLoginProps {
  onSuccess: () => void;
}

export default function AdminLogin({ onSuccess }: AdminLoginProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // Simulated network delay for premium feel
    setTimeout(() => {
      if (password === "admin123") {
        sessionStorage.setItem("isAdminAuthenticated", "true");
        onSuccess();
      } else {
        setError("Clave incorrecta. Por favor, intente de nuevo.");
        setPassword("");
      }
      setIsSubmitting(false);
    }, 600);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 relative overflow-hidden bg-[#121212]">
      {/* Editorial aesthetic ambient light */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-950/20 rounded-full blur-[100px] pointer-events-none select-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-[#161616] border border-white/10 p-8 rounded-none relative z-10 shadow-2xl"
      >
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-red-950/20 text-[#b91c1c] rounded-none border border-[#b91c1c]/30 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 animate-pulse" />
          </div>
          
          <h2 className="font-serif italic text-3xl text-white tracking-tight">Consola de Seguridad</h2>
          <p className="text-xs text-zinc-500 uppercase tracking-widest mt-2 font-mono">
            Acceso Restringido a Administradores
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <label className="block text-[10px] uppercase font-mono tracking-widest text-zinc-500 font-bold mb-2">
              Ingresa la Clave de Seguridad
            </label>
            
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-600">
                <KeyRound className="w-4 h-4" />
              </span>
              
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#121212] border border-white/10 focus:border-[#b91c1c] rounded-none pl-10 pr-10 py-3 text-sm text-neutral-100 outline-none transition font-mono"
                autoFocus
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-white transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-950/20 border border-red-900/40 text-red-400 p-3 text-xs flex items-center gap-2 font-mono"
            >
              <ShieldAlert className="w-4 h-4 shrink-0 text-[#b91c1c]" />
              <span>{error}</span>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#b91c1c] hover:bg-red-700 disabled:bg-zinc-800 text-white font-mono uppercase tracking-widest py-3 px-4 rounded-none flex items-center justify-center gap-2 transition duration-300 transform active:scale-95 text-xs font-semibold select-none cursor-pointer"
          >
            {isSubmitting ? (
              <>Validando Acceso...</>
            ) : (
              <>Desbloquear Consola</>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-[10px] text-zinc-600 font-mono">
          © 2026 Entre Parrilleros • Central Intelligence
        </div>
      </motion.div>
    </div>
  );
}
