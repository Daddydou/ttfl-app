import type { ReactNode } from "react";
import Link from "next/link";

// Petits blocs communs à toutes les sous-pages Stats (rendus côté serveur, aucune dépendance externe).

export type Ton = "neutre" | "bon" | "mauvais";

const COULEUR_TON: Record<Ton, string> = { neutre: "text-fg", bon: "text-avail", mauvais: "text-out" };

// Une grosse tuile « chiffre + légende ».
export function Tuile({ label, valeur, detail, ton = "neutre" }: { label: string; valeur: string; detail?: string; ton?: Ton }) {
  return (
    <div className="card px-4 py-3" data-testid="tuile">
      <div className={`text-[26px] font-bold leading-tight tracking-[-0.02em] num ${COULEUR_TON[ton]}`}>{valeur}</div>
      <div className="text-[13px] uppercase tracking-wide text-fg-muted">{label}</div>
      {detail && <div className="mt-0.5 truncate text-[12px] text-fg-muted">{detail}</div>}
    </div>
  );
}

export function GrilleTuiles({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>;
}

// Une section : titre, phrase d'explication facultative, contenu.
export function Carte({ titre, aide, children }: { titre: string; aide?: string; children: ReactNode }) {
  return (
    <section className="card p-4">
      <h2 className="headline">{titre}</h2>
      {aide && <p className="mb-3 mt-0.5 text-[13px] text-fg-muted">{aide}</p>}
      {!aide && <div className="mb-2" />}
      {children}
    </section>
  );
}

export function Vide({ children }: { children: ReactNode }) {
  return (
    <div className="card px-4 py-10 text-center">
      <p className="text-sm text-fg-muted">{children}</p>
    </div>
  );
}

// Lien vers une sous-page, avec un petit résumé (sert au menu de l'aperçu).
export function CarteLien({ href, titre, resume }: { href: string; titre: string; resume: string }) {
  return (
    <Link href={href} className="card block px-4 py-3 active:opacity-70">
      <div className="headline">{titre}</div>
      <div className="mt-0.5 text-[13px] text-fg-muted">{resume}</div>
    </Link>
  );
}

export interface ItemBarre {
  label: string;
  valeur: number;
  texte?: string; // texte affiché à droite (par défaut : la valeur)
  detail?: string; // petite ligne sous l'étiquette
  ton?: Ton;
}

const FOND_TON: Record<Ton, string> = { neutre: "bg-fill", bon: "bg-avail/70", mauvais: "bg-out/70" };

// Barres horizontales : une ligne par élément, la plus longue = le maximum.
export function BarresH({ items, max }: { items: ItemBarre[]; max?: number }) {
  const m = Math.max(1, max ?? 0, ...items.map((i) => Math.abs(i.valeur)));
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-3">
          <div className="w-24 shrink-0">
            <div className="truncate text-[13px] font-medium text-fg">{i.label}</div>
            {i.detail && <div className="truncate text-[11px] text-fg-muted">{i.detail}</div>}
          </div>
          <div className="h-5 flex-1 overflow-hidden rounded-md bg-surface-2">
            <div
              className={`h-full rounded-md ${FOND_TON[i.ton ?? "neutre"]}`}
              style={{ width: `${(Math.abs(i.valeur) / m) * 100}%`, minWidth: i.valeur !== 0 ? "6px" : "0" }}
            />
          </div>
          <span className="w-12 shrink-0 text-right text-sm font-bold tabular-nums text-fg">{i.texte ?? String(i.valeur)}</span>
        </li>
      ))}
    </ul>
  );
}

export interface ItemColonne {
  label: string;
  valeur: number;
  ton?: Ton;
}

// Colonnes verticales (SVG) : un score par date ou par catégorie.
export function Colonnes({ items, titre, reperes = [] }: { items: ItemColonne[]; titre: string; reperes?: number[] }) {
  if (items.length === 0) return null;
  const W = 320;
  const H = 140;
  const g = 8;
  const d = 10;
  const b = 20;
  const iw = W - 2 * g;
  const ih = H - d - b;
  const max = Math.max(1, ...items.map((i) => i.valeur), ...reperes);
  const bande = iw / items.length;
  const larg = Math.max(3, Math.min(26, bande * 0.62));
  const y = (v: number) => d + ih - (Math.max(0, v) / max) * ih;
  const pas = Math.max(1, Math.ceil(items.length / 8));
  const classe = (t?: Ton) => (t === "bon" ? "fill-avail/70" : t === "mauvais" ? "fill-out/70" : "fill-fg-muted/45");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={titre}>
      {reperes.map((v) => (
        <g key={v}>
          <line x1={g} x2={W - g} y1={y(v)} y2={y(v)} className="stroke-line-strong" strokeWidth="1" strokeDasharray="2 3" />
          <text x={g} y={y(v) - 2} className="fill-fg-faint" fontSize="8">
            {v}
          </text>
        </g>
      ))}
      {items.map((i, k) => {
        const cx = g + bande * (k + 0.5);
        return (
          <g key={`${i.label}-${k}`}>
            <rect x={cx - larg / 2} y={y(i.valeur)} width={larg} height={d + ih - y(i.valeur)} rx={Math.min(3, larg / 2)} className={classe(i.ton)} />
            {k % pas === 0 && (
              <text x={cx} y={H - 6} textAnchor="middle" className="fill-fg-muted" fontSize="8">
                {i.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export interface SerieLigne {
  nom: string;
  valeurs: (number | null)[];
}

// Les teintes évitent l'or (réservé aux actions) : neutre, vert, jaune, rouge, gris.
const TEINTES = ["rgb(var(--c-fg))", "rgb(var(--c-avail))", "rgb(var(--c-quest))", "rgb(var(--c-out))", "rgb(var(--c-fg-muted))", "rgb(var(--c-doubt))"];

// Courbes (SVG), une par série ; une valeur null coupe le trait. `labels` : un par point (dates courtes).
export function Lignes({ series, labels, titre }: { series: SerieLigne[]; labels: string[]; titre: string }) {
  const n = labels.length;
  if (n === 0 || series.length === 0) return null;
  const W = 320;
  const H = 150;
  const g = 10;
  const d = 10;
  const b = 20;
  const iw = W - 2 * g;
  const ih = H - d - b;
  const toutes = series.flatMap((s) => s.valeurs).filter((v): v is number => v !== null);
  if (toutes.length === 0) return null;
  const min = Math.min(0, ...toutes);
  const max = Math.max(1, ...toutes);
  const x = (i: number) => g + (n === 1 ? iw / 2 : (iw * i) / (n - 1));
  const y = (v: number) => d + ih - ((v - min) / (max - min || 1)) * ih;
  const pas = Math.max(1, Math.ceil(n / 6));
  const chemin = (vals: (number | null)[]) => {
    let p = "";
    let coupe = true;
    vals.forEach((v, i) => {
      if (v === null) {
        coupe = true;
        return;
      }
      p += `${coupe ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
      coupe = false;
    });
    return p.trim();
  };
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={titre}>
        <line x1={g} x2={W - g} y1={y(min)} y2={y(min)} className="stroke-line-strong" strokeWidth="1" />
        <text x={g} y={d - 1} className="fill-fg-faint" fontSize="8">
          {Math.round(max)}
        </text>
        {series.map((s, k) => (
          <path key={s.nom} d={chemin(s.valeurs)} fill="none" stroke={TEINTES[k % TEINTES.length]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {labels.map((l, i) =>
          i % pas === 0 ? (
            <text key={`${l}-${i}`} x={x(i)} y={H - 6} textAnchor="middle" className="fill-fg-muted" fontSize="8">
              {l}
            </text>
          ) : null,
        )}
      </svg>
      {series.length > 1 && (
        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {series.map((s, k) => (
            <li key={s.nom} className="flex items-center gap-1.5 text-[12px] text-fg-muted">
              <span className="inline-block h-0.5 w-4 rounded" style={{ backgroundColor: TEINTES[k % TEINTES.length] }} />
              {s.nom}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Tableau simple : en-têtes + lignes de texte.
export function Tableau({ colonnes, lignes }: { colonnes: string[]; lignes: ReactNode[][] }) {
  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full text-left text-[13px]">
        <thead>
          <tr className="text-[11px] uppercase tracking-wide text-fg-muted">
            {colonnes.map((c, i) => (
              <th key={c} className={`px-1 py-1 font-semibold ${i === 0 ? "" : "text-right"}`}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lignes.map((l, r) => (
            <tr key={r} className="border-t border-line">
              {l.map((c, i) => (
                <td key={i} className={`px-1 py-1.5 tabular-nums ${i === 0 ? "font-medium text-fg" : "text-right text-fg"}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
