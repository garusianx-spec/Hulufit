"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { Avatar, Chip, ProgressBar, Sep } from "@/components/ui/Bits";
import { ChevronLeft, CloseIcon, SearchIcon } from "@/components/ui/Icons";
import { adminUsers, type UserState } from "@/lib/mock/admin";
import { cx, faDate, faNumber, faRelative } from "@/lib/format";

const STATE_META: Record<UserState, { label: string; tone: string }> = {
  active: { label: "فعال", tone: "bg-primary-50 text-primary-700" },
  at_risk: { label: "در معرض ریزش", tone: "bg-warn-50 text-warn-600" },
  expired: { label: "منقضی", tone: "bg-danger-50 text-danger-600" },
};

const FILTERS: Array<{ key: UserState | "all"; label: string }> = [
  { key: "all", label: "همه" },
  { key: "active", label: "فعال" },
  { key: "at_risk", label: "در معرض ریزش" },
  { key: "expired", label: "منقضی" },
];

export default function AdminUsersPage() {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<UserState | "all">("all");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return adminUsers.filter((u) => {
      if (state !== "all" && u.status !== state) return false;
      if (!q) return true;
      return `${u.name} ${u.phone} ${u.specialist}`.toLowerCase().includes(q);
    });
  }, [query, state]);

  return (
    <AdminShell title="مدیریت کاربران" subtitle={`${faNumber(adminUsers.length)} کاربر ثبت‌شده`}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-2 rounded-pill border border-line bg-surface px-3.5 py-2.5">
            <SearchIcon width={17} height={17} className="shrink-0 text-ink-soft" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجوی نام، شماره یا متخصص…"
              type="search"
              className="w-full bg-transparent text-xs text-ink outline-none placeholder:text-ink-soft"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="پاک کردن" className="text-ink-soft">
                <CloseIcon width={15} height={15} />
              </button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {FILTERS.map((f) => (
              <Chip key={f.key} active={state === f.key} onClick={() => setState(f.key)}>
                {f.label}
              </Chip>
            ))}
          </div>
        </div>

        <p className="text-2xs text-ink-muted">{faNumber(rows.length)} نتیجه</p>

        <div className="app-card overflow-hidden p-0">
          {/* Table from md up; the same rows stack as cards on a phone. */}
          <table className="hidden w-full text-right md:table">
            <thead className="border-b border-line bg-canvas">
              <tr className="text-2xs text-ink-muted">
                <Th>کاربر</Th>
                <Th>وضعیت</Th>
                <Th>برنامه</Th>
                <Th>متخصص</Th>
                <Th>پایبندی</Th>
                <Th>آخرین فعالیت</Th>
                <Th> </Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((u) => (
                <tr key={u.id} className="transition-colors hover:bg-canvas">
                  <Td>
                    <Link href={`/admin/users/${u.id}`} className="flex items-center gap-2.5">
                      <Avatar name={u.name} size={34} />
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-bold text-ink">{u.name}</span>
                        <span className="block text-2xs text-ink-soft">{u.phone}</span>
                      </span>
                    </Link>
                  </Td>
                  <Td>
                    <span className={cx("rounded-pill px-2 py-0.5 text-[0.6rem] font-bold", STATE_META[u.status].tone)}>
                      {STATE_META[u.status].label}
                    </span>
                  </Td>
                  <Td className="text-2xs text-ink">{u.plan}</Td>
                  <Td className="text-2xs text-ink-muted">{u.specialist}</Td>
                  <Td>
                    <div className="w-24">
                      <div className="mb-1 text-[0.6rem] font-bold text-ink">{faNumber(u.adherencePct)}٪</div>
                      <ProgressBar
                        value={u.adherencePct}
                        height={5}
                        tone={u.adherencePct >= 80 ? "primary" : u.adherencePct >= 60 ? "warn" : "danger"}
                      />
                    </div>
                  </Td>
                  <Td className="text-2xs text-ink-muted">{faRelative(u.lastSeen)}</Td>
                  <Td>
                    <Link href={`/admin/users/${u.id}`} aria-label={`جزئیات ${u.name}`} className="text-ink-soft">
                      <ChevronLeft width={16} height={16} />
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>

          <ul className="divide-y divide-line md:hidden">
            {rows.map((u) => (
              <li key={u.id}>
                <Link href={`/admin/users/${u.id}`} className="flex items-center gap-3 p-3.5">
                  <Avatar name={u.name} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-xs font-bold text-ink">{u.name}</span>
                      <span className={cx("shrink-0 rounded-pill px-1.5 py-0.5 text-[0.55rem] font-bold", STATE_META[u.status].tone)}>
                        {STATE_META[u.status].label}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-2xs text-ink-muted">
                      {u.plan}
                      <Sep />
                      پایبندی {faNumber(u.adherencePct)}٪
                      <Sep />
                      {faDate(u.joinedAt)}
                    </span>
                  </span>
                  <ChevronLeft width={16} height={16} className="shrink-0 text-ink-soft" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AdminShell>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-2.5 font-medium">{children}</th>;
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cx("px-4 py-3 align-middle", className)}>{children}</td>;
}
