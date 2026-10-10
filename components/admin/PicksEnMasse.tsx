"use client";

import { useMemo, useState, useTransition } from "react";
import { copierPicks, importerPicks, supprimerPicks, type ResultatAdmin } from "@/app/(app)/admin/actions";
import { SelecteurComptes } from "@/components/admin/SelecteurComptes";
import { MOT_CONFIRMATION, parserImport } from "@/lib/admin";
import { COMPTES_EQUIPE, ajouterJours } from "@/lib/planning";

type Onglet = "importer" | "copier" | "supprimer";
type Verification = { cle: string; res: ResultatAdmin } | null;

const champ =
  "field mt-1 block w-full";
const principal =
  "btn btn-primary w-full";
const secondaire =
  "btn btn-secondary w-full";

// Importer / copier / supprimer des picks sur plusieurs comptes. Chaque opération a un « Vérifier » qui montre ce qui
// serait fait SANS rien écrire ; le bouton d'écriture ne s'active qu'après une vérification réussie des mêmes données.
export function PicksEnMasse({ aujourdhui }: { aujourdhui: string }) {
  const [onglet, setOnglet] = useState<Onglet>("importer");
  const onglets: { id: Onglet; label: string }[] = [
    { id: "importer", label: "Importer" },
    { id: "copier", label: "Copier" },
    { id: "supprimer", label: "Supprimer" },
  ];
  return (
    <section className="space-y-3">
      <h2 className="section-label">Picks en masse</h2>
      <div className="seg" role="tablist" aria-label="Opération">
        {onglets.map((o) => (
          <button
            key={o.id}
            role="tab"
            aria-selected={onglet === o.id}
            onClick={() => setOnglet(o.id)}
            className={`seg-item ${onglet === o.id ? "seg-item-on" : ""}`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <div className="card p-4">
        {onglet === "importer" && <Importer aujourdhui={aujourdhui} />}
        {onglet === "copier" && <Copier aujourdhui={aujourdhui} />}
        {onglet === "supprimer" && <Supprimer aujourdhui={aujourdhui} />}
      </div>
    </section>
  );
}

function Resultat({ res }: { res: ResultatAdmin | null }) {
  if (!res) return null;
  if (!res.ok) return <p className="mt-3 rounded-[10px] bg-out/10 px-3 py-2 text-[13px] text-out">{res.error}</p>;
  return (
    <div className="mt-3 rounded-[10px] bg-avail/10 px-3 py-2 text-[13px] text-avail">
      <p>{res.message}</p>
      {res.details.length > 0 && (
        <ul className="mt-1.5 space-y-0.5 text-quest">
          {res.details.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

// --- Importer ---------------------------------------------------------------------------------------------------

function Importer({ aujourdhui }: { aujourdhui: string }) {
  const [texte, setTexte] = useState("");
  const [comptes, setComptes] = useState<string[]>([...COMPTES_EQUIPE]);
  const [verif, setVerif] = useState<Verification>(null);
  const [fini, setFini] = useState<ResultatAdmin | null>(null);
  const [pending, start] = useTransition();

  const analyse = useMemo(() => parserImport(texte, aujourdhui), [texte, aujourdhui]);
  const lignes = analyse.lignes.map(({ date, player }) => ({ date, player }));
  const cle = JSON.stringify([lignes, comptes]);
  const verifie = verif?.cle === cle && verif.res.ok;
  const peutVerifier = lignes.length > 0 && comptes.length > 0;

  function verifier() {
    setFini(null);
    start(async () => setVerif({ cle, res: await importerPicks("regular", lignes, comptes, false) }));
  }
  function importer() {
    start(async () => {
      setFini(await importerPicks("regular", lignes, comptes, true));
      setVerif(null);
    });
  }

  return (
    <div>
      <label className="block text-[13px] text-fg-muted">
        Un pick par ligne : la date, puis le joueur
        <textarea
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          rows={7}
          aria-label="Picks à importer"
          placeholder={"21/10 Nikola Jokic\n22/10 Luka Doncic\n2026-10-23;Jayson Tatum"}
          className={`${champ} font-mono`}
        />
      </label>
      <p className="mt-1.5 text-[13px] text-fg-muted">
        <span className="font-semibold text-fg">{analyse.lignes.length}</span> pick(s) reconnu(s)
        {analyse.erreurs.length > 0 && <span className="text-out"> · {analyse.erreurs.length} ligne(s) à corriger</span>}
      </p>
      {analyse.erreurs.length > 0 && (
        <ul className="mt-1 space-y-0.5 text-[13px] text-out">
          {analyse.erreurs.slice(0, 8).map((e) => (
            <li key={e.n}>
              Ligne {e.n} : {e.raison}
            </li>
          ))}
        </ul>
      )}

      <SelecteurComptes valeur={comptes} onChange={setComptes} legende="Importer sur" />

      <div className="mt-4 space-y-2">
        <button onClick={verifier} disabled={!peutVerifier || pending} className={secondaire}>
          {pending ? "…" : "Vérifier"}
        </button>
        <button onClick={importer} disabled={!verifie || pending} className={principal}>
          Importer {lignes.length} pick(s) sur {comptes.length} compte(s)
        </button>
      </div>
      <Resultat res={verif?.cle === cle ? verif.res : fini} />
    </div>
  );
}

// --- Copier -------------------------------------------------------------------------------------------------------

function Copier({ aujourdhui }: { aujourdhui: string }) {
  const [source, setSource] = useState("03");
  const [destinations, setDestinations] = useState<string[]>([]);
  const [debut, setDebut] = useState(aujourdhui);
  const [fin, setFin] = useState(ajouterJours(aujourdhui, 30));
  const [verif, setVerif] = useState<Verification>(null);
  const [fini, setFini] = useState<ResultatAdmin | null>(null);
  const [pending, start] = useTransition();

  const cle = JSON.stringify([source, destinations, debut, fin]);
  const verifie = verif?.cle === cle && verif.res.ok;
  const peutVerifier = destinations.filter((c) => c !== source).length > 0;

  function verifier() {
    setFini(null);
    start(async () => setVerif({ cle, res: await copierPicks("regular", source, destinations, debut, fin, false) }));
  }
  function copier() {
    start(async () => {
      setFini(await copierPicks("regular", source, destinations, debut, fin, true));
      setVerif(null);
    });
  }

  return (
    <div>
      <p className="text-[13px] text-fg-muted">Recopie les picks d&apos;un compte vers d&apos;autres, sur une période.</p>
      <label className="mt-3 block text-[13px] text-fg-muted">
        Compte source
        <select value={source} onChange={(e) => setSource(e.target.value)} aria-label="Compte source" className={champ}>
          {["01", "02", ...COMPTES_EQUIPE].map((c) => (
            <option key={c} value={c}>Compte {c}</option>
          ))}
        </select>
      </label>
      <SelecteurComptes valeur={destinations} onChange={setDestinations} legende="Copier vers" />
      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="block text-[13px] text-fg-muted">
          Du
          <input type="date" value={debut} onChange={(e) => setDebut(e.target.value)} aria-label="Du" className={champ} />
        </label>
        <label className="block text-[13px] text-fg-muted">
          Au
          <input type="date" value={fin} onChange={(e) => setFin(e.target.value)} aria-label="Au" className={champ} />
        </label>
      </div>
      <div className="mt-4 space-y-2">
        <button onClick={verifier} disabled={!peutVerifier || pending} className={secondaire}>
          {pending ? "…" : "Vérifier"}
        </button>
        <button onClick={copier} disabled={!verifie || pending} className={principal}>
          Copier vers {destinations.filter((c) => c !== source).length} compte(s)
        </button>
      </div>
      <Resultat res={verif?.cle === cle ? verif.res : fini} />
    </div>
  );
}

// --- Supprimer ----------------------------------------------------------------------------------------------------

function Supprimer({ aujourdhui }: { aujourdhui: string }) {
  const [comptes, setComptes] = useState<string[]>([]);
  const [debut, setDebut] = useState(aujourdhui);
  const [fin, setFin] = useState(ajouterJours(aujourdhui, 30));
  const [confirmation, setConfirmation] = useState("");
  const [verif, setVerif] = useState<Verification>(null);
  const [fini, setFini] = useState<ResultatAdmin | null>(null);
  const [pending, start] = useTransition();

  const cle = JSON.stringify([comptes, debut, fin]);
  const verifie = verif?.cle === cle && verif.res.ok;

  function verifier() {
    setFini(null);
    start(async () => setVerif({ cle, res: await supprimerPicks("regular", comptes, debut, fin, "", false) }));
  }
  function supprimer() {
    start(async () => {
      setFini(await supprimerPicks("regular", comptes, debut, fin, confirmation, true));
      setVerif(null);
      setConfirmation("");
    });
  }

  return (
    <div>
      <p className="text-[13px] leading-relaxed text-fg-muted">
        Retire des picks <span className="font-semibold text-fg">à venir</span> de l&apos;application. Les picks passés sont
        protégés (ils portent les scores) et rien n&apos;est retiré sur le site TTFL.
      </p>
      <SelecteurComptes valeur={comptes} onChange={setComptes} legende="Supprimer sur" />
      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="block text-[13px] text-fg-muted">
          Du
          <input type="date" value={debut} min={aujourdhui} onChange={(e) => setDebut(e.target.value)} aria-label="Du" className={champ} />
        </label>
        <label className="block text-[13px] text-fg-muted">
          Au
          <input type="date" value={fin} onChange={(e) => setFin(e.target.value)} aria-label="Au" className={champ} />
        </label>
      </div>
      <div className="mt-4 space-y-2">
        <button onClick={verifier} disabled={comptes.length === 0 || pending} className={secondaire}>
          {pending ? "…" : "Vérifier"}
        </button>
        {verifie && (
          <label className="block text-[13px] text-fg-muted">
            Pour confirmer, tape <span className="font-bold text-out">{MOT_CONFIRMATION}</span>
            <input
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              aria-label="Confirmation"
              autoCapitalize="characters"
              autoComplete="off"
              className={champ}
            />
          </label>
        )}
        <button
          onClick={supprimer}
          disabled={!verifie || confirmation.trim() !== MOT_CONFIRMATION || pending}
          className="btn btn-danger w-full"
        >
          Supprimer
        </button>
      </div>
      <Resultat res={verif?.cle === cle ? verif.res : fini} />
    </div>
  );
}
