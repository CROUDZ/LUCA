import Link from "next/link";
import { redirect } from "next/navigation";
import { ModStatus } from "@prisma/client";
import { auth, signOut } from "@/auth";
import prisma from "@/lib/prisma";

const statusChip: Record<ModStatus, string> = {
  APPROVED: "border-emerald-700/50 bg-emerald-900/40 text-emerald-200",
  ARCHIVED: "border-slate-700/50 bg-slate-900/50 text-slate-200",
  DRAFT: "border-gray-700/50 bg-gray-800/60 text-gray-200",
  PENDING: "border-amber-700/50 bg-amber-900/40 text-amber-100",
  REJECTED: "border-red-700/50 bg-red-900/40 text-red-100",
  SUSPENDED: "border-orange-700/50 bg-orange-900/40 text-orange-100",
};

function formatDate(value: Date | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(value);
}

export default async function ProfilePage() {
  const session = await auth();

  if (!session) {
    const callback = encodeURIComponent("/profile");
    redirect(`/login?callbackUrl=${callback}`);
  }

  const userId = session.user.id;

  const [profileUser, modsCount, pendingCount, downloadsAggregate, recentMods] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        createdAt: true,
        emailVerified: true,
        avatarUrl: true,
        bio: true,
        name: true,
      },
    }),
    prisma.mod.count({ where: { authorId: userId } }),
    prisma.mod.count({ where: { authorId: userId, status: ModStatus.PENDING } }),
    prisma.mod.aggregate({ where: { authorId: userId }, _sum: { downloads: true } }),
    prisma.mod.findMany({
      where: { authorId: userId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        displayName: true,
        status: true,
        downloads: true,
        updatedAt: true,
      },
    }),
  ]);

  const totalDownloads = downloadsAggregate._sum.downloads ?? 0;
  const joinedAt = profileUser?.createdAt ?? null;
  const verifiedAt = profileUser?.emailVerified ?? null;

  const handleSignOut = async () => {
    "use server";
    await signOut({ redirectTo: "/" });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 space-y-10">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-linear-to-r from-sky-900 to-indigo-900 p-8 shadow-xl">
        <div className="absolute right-0 top-0 h-48 w-48 -translate-y-12 translate-x-10 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="absolute left-10 bottom-0 h-40 w-40 translate-y-16 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.35em] text-sky-200/80">Profil</p>
            <h1 className="text-3xl md:text-4xl font-semibold">
              Bonjour, {session.user.name || session.user.email}
            </h1>
            <p className="text-slate-200/80 max-w-2xl">
              Gérez vos informations, vos mods et vos accès. La session est synchronisée avec le header : toute
              connexion ou déconnexion sera reflétée immédiatement.
            </p>
            <div className="flex flex-wrap gap-3 text-sm text-slate-200">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1">
                <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden />
                Rôle : {session.user.role}
              </span>
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 ${
                  session.user.verified
                    ? "border-emerald-400/40 bg-emerald-900/40 text-emerald-100"
                    : "border-amber-400/40 bg-amber-900/40 text-amber-100"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-current opacity-80" aria-hidden />
                {session.user.verified ? "Email vérifié" : "Vérification requise"}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                <span className="text-slate-300">Inscrit le</span>
                <span className="font-semibold">{formatDate(joinedAt)}</span>
              </span>
            </div>
          </div>
          <div className="flex w-full flex-col gap-3 md:w-auto md:items-end">
            <Link
              href="/mods/upload"
              className="inline-flex items-center justify-center rounded-lg bg-white/90 px-4 py-2 text-sm font-semibold text-sky-900 shadow-lg shadow-sky-900/40 transition hover:bg-white"
            >
              Publier un mod
            </Link>
            <form action={handleSignOut} className="w-full md:w-auto">
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:border-white/40 hover:bg-white/10"
              >
                Se déconnecter
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-5 shadow">
          <p className="text-sm text-slate-400">Mods publiés</p>
          <p className="mt-2 text-3xl font-semibold">{modsCount}</p>
          <p className="text-xs text-slate-400 mt-1">Tous statuts confondus</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-5 shadow">
          <p className="text-sm text-slate-400">En attente de review</p>
          <p className="mt-2 text-3xl font-semibold">{pendingCount}</p>
          <p className="text-xs text-slate-400 mt-1">Statut Pending</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-5 shadow">
          <p className="text-sm text-slate-400">Téléchargements cumulés</p>
          <p className="mt-2 text-3xl font-semibold">{totalDownloads}</p>
          <p className="text-xs text-slate-400 mt-1">Somme sur vos mods</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2 rounded-xl border border-white/10 bg-slate-900/60 p-6 shadow">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Dernières mises à jour</h2>
              <p className="text-sm text-slate-400">Vos cinq derniers mods ou mises à jour</p>
            </div>
            <Link
              href="/mods"
              className="text-sm text-sky-300 underline-offset-4 hover:text-white hover:underline"
            >
              Voir la librairie
            </Link>
          </div>

          <div className="mt-4 divide-y divide-white/5">
            {recentMods.length === 0 && (
              <p className="py-6 text-sm text-slate-400">Aucun mod pour l&apos;instant. Publiez votre premier !</p>
            )}
            {recentMods.map((mod) => (
              <div key={mod.id} className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-white">{mod.displayName}</p>
                    <span className={`rounded-full border px-2 py-1 text-[11px] font-medium ${statusChip[mod.status]}`}>
                      {mod.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">Slug : {mod.name}</p>
                  <p className="text-xs text-slate-400">Dernière mise à jour : {formatDate(mod.updatedAt)}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-lg font-semibold">{mod.downloads}</p>
                    <p className="text-xs text-slate-400">downloads</p>
                  </div>
                  <Link
                    href={`/mods/${mod.name}`}
                    className="inline-flex items-center rounded-md border border-white/20 px-3 py-2 text-sm text-white transition hover:border-white/40 hover:bg-white/5"
                  >
                    Ouvrir
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-slate-900/60 p-6 shadow">
          <h2 className="text-lg font-semibold">Coordonnées du compte</h2>
          <div className="mt-4 space-y-4 text-sm text-slate-200">
            <div className="space-y-1">
              <p className="text-slate-400">Nom</p>
              <p className="font-semibold">{session.user.name || "Non renseigné"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-slate-400">Email</p>
              <p className="font-semibold">{session.user.email}</p>
            </div>
            <div className="space-y-1">
              <p className="text-slate-400">Rôle</p>
              <p className="font-semibold">{session.user.role}</p>
            </div>
            <div className="space-y-1">
              <p className="text-slate-400">Email vérifié</p>
              <p className="font-semibold">{session.user.verified ? "Oui" : "Non"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-slate-400">Compte créé le</p>
              <p className="font-semibold">{formatDate(joinedAt)}</p>
            </div>
            {verifiedAt && (
              <div className="space-y-1">
                <p className="text-slate-400">Vérifié le</p>
                <p className="font-semibold">{formatDate(verifiedAt)}</p>
              </div>
            )}
            <div className="pt-2">
              <Link
                href="/mods/upload"
                className="inline-flex items-center rounded-md border border-white/20 px-3 py-2 text-sm text-white transition hover:border-white/40 hover:bg-white/5"
              >
                Ajouter un nouveau mod
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
