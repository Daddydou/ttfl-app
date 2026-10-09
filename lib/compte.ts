// Compte TTFL « de référence » des écrans actuels de l'application
// (Ce soir, Mes picks, Stats, cycle de 30 jours) : le compte principal 01.
//
// Depuis la migration « un pick par compte », ttfl_picks contient une ligne par
// soirée ET par compte ('01' … '12'). Les écrans multi-comptes viendront ; en
// attendant, ces écrans lisent et écrivent uniquement le compte 01 — sinon un pick
// d'un autre compte apparaîtrait comme « mon pick du soir ».
export const COMPTE_REF = "01";
