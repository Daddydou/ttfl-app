import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup, configure } from "@testing-library/react";

// Machines lentes (intégration continue, 43 fichiers en parallèle) : on laisse plus de temps aux attentes asynchrones
// avant de conclure à un échec (un test « Importer des picks » a échoué une fois sous charge, sans raison de fond).
configure({ asyncUtilTimeout: 4000 });

afterEach(() => cleanup());
