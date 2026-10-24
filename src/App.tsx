import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Compass,
  ExternalLink,
  FileCheck2,
  FileText,
  Globe2,
  Landmark,
  LayoutGrid,
  List,
  LoaderCircle,
  MapPin,
  Menu,
  Plus,
  RefreshCw,
  Scale,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UsersRound,
  Vote,
  X,
} from "lucide-react";
import type { Dataset, Evidence, Person } from "./types";
import { filterPeople, toggleSelection } from "./model";

type Lang = "es" | "en";
type Page = "explore" | "saved" | "compare" | "sources";
const copy = {
  es: {
    explore: "Explorar",
    saved: "Mi seguimiento",
    compare: "Comparar",
    sources: "Fuentes y cobertura",
    guide: "Cómo funciona",
    tagline: "Más información. Mejor decisión.",
    navLabel: "TU ESPACIO CÍVICO",
    independent: "Independiente. Siempre.",
    territory: "Hecho para Puerto Rico",
    breadcrumb: "Tu voz empieza con información.",
    intro: "INFORMACIÓN PARA DECIDIR",
    hero1: "Tu voto merece el",
    hero2: "panorama completo.",
    sub: "Conoce a quienes te representan. Explora sus posturas, consulta la evidencia y forma tu propia opinión.",
    mapTitle: "Una isla. Muchas voces.",
    mapSub: "78 municipios · una conversación pública",
    people: "Perfiles públicos",
    institutions: "Instituciones",
    evidence: "Registros de evidencia",
    following: "Personas que sigues",
    section: "Conoce a quienes hablan por ti",
    sectionSub: "Personas, trayectoria y fuentes. Todo en un mismo lugar.",
    aboutData: "Sobre estos datos",
    search: "Busca por nombre, municipio o cargo…",
    filters: "Filtros",
    all: "Todos",
    officials: "Representantes",
    candidates: "Candidaturas",
    party: "Partido",
    institution: "Institución",
    issue: "Tema con evidencia",
    allParties: "Todos los partidos",
    allInstitutions: "Todas las instituciones",
    allIssues: "Todos los temas",
    senate: "Senado",
    house: "Cámara",
    executive: "Ejecutivo",
    federal: "Federal",
    "disaster-preparedness": "Preparación ante desastres",
    infrastructure: "Infraestructura",
    energy: "Energía",
    health: "Salud",
    education: "Educación",
    economy: "Economía",
    governance: "Gobernanza",
    status: "Estatus",
    results: "perfiles",
    nameSort: "Nombre: A–Z",
    officeSort: "Por institución",
    sourceLinked: "Perfil con fuente",
    viewProfile: "Ver perfil",
    follow: "Seguir",
    unfollow: "Dejar de seguir",
    evidenceCount: "registros",
    noEvidence: "Evidencia por incorporar",
    comparePerson: "Comparar",
    clear: "Limpiar filtros",
    empty: "No encontramos perfiles",
    emptySub: "Prueba otro nombre o amplía los filtros para seguir explorando.",
    savedTitle: "Tu radar cívico",
    savedSub:
      "Sigue a las personas que te interesan. Tu selección se guarda en este navegador.",
    noSaved: "Tu radar empieza contigo",
    noSavedSub:
      "Guarda un perfil con el marcador para encontrarlo aquí. No enviamos notificaciones ni creamos una cuenta.",
    compareTitle: "La evidencia, lado a lado",
    compareSub:
      "Compara hasta tres personas. La falta de registros no equivale a estar a favor o en contra.",
    chooseCompare: "Elige al menos dos perfiles",
    chooseCompareSub:
      "Usa «Comparar» en las tarjetas para construir tu propia comparación.",
    export: "Exportar CSV",
    sourcesTitle: "La confianza empieza en la fuente",
    sourcesSub:
      "Consulta de dónde vienen los datos, cuándo se recuperaron y qué falta por incorporar.",
    refresh: "Actualizar directorio",
    refreshing: "Actualizando…",
    coverage: "Cobertura del directorio inicial",
    coverageText:
      "Perfiles de Puerto Rico, a partir del registro cívico Open States. No es un censo completo ni una lista certificada de candidaturas. Las afiliaciones y los cargos pueden cambiar.",
    gapTitle: "Lo que todavía no sabemos",
    gapText:
      "Aún no hay votos nominales ni posturas de política pública importados. No atribuimos posturas a una persona por su partido. Las candidaturas se incorporan con su año electoral y su fuente.",
    fullSources: "Abrir fuente",
    snapshot: "Instantánea",
    live: "Actualizada",
    blocked: "Acceso bloqueado",
    error: "Error al actualizar",
    not_connected: "Sin conexión directa",
    retrieved: "Consultada",
    unknown: "Sin verificar",
    profile: "Perfil público",
    record: "Registro de evidencia",
    statements: "Lo que dice",
    actions: "Lo que hace",
    votes: "Votos",
    allRecords: "Todo el registro",
    noRecords: "Todavía no hay evidencia incorporada",
    noRecordsSub:
      "Este perfil incluye datos del directorio, pero aún no tiene declaraciones, votos o acciones importados. Consulta las fuentes originales para investigar.",
    officialLink: "Consultar perfil original",
    provenance: "Procedencia del perfil",
    updated: "Instantánea del",
    historical: "Candidatura histórica",
    former: "Cargo anterior",
    partialCoverage:
      "La evidencia incorporada es parcial. Consulta cada fuente y su contexto. Los temas sin registros permanecen sin determinar; no equivalen a apoyo ni oposición.",
    emptyCategory: "No hay registros en esta categoría",
    emptyCategorySub:
      "Este perfil tiene evidencia en otras categorías. Consulta Todo el registro para verla.",
    election: "Elección",
    current: "Cargo público",
    source: "Fuente",
    context: "Contexto",
    original: "Texto original",
    supports: "A favor",
    opposes: "En contra",
    not_recorded: "Postura no determinada",
    reviewed: "Cotejado con la fuente",
    source_linked: "Fuente vinculada",
    footnote: "La evidencia informa. Tú decides.",
    footerSub: "Un proyecto cívico independiente para Puerto Rico.",
    methodology: "Nuestra metodología",
    methodTitle: "Menos ruido. Más contexto.",
    method1: "Fuentes antes que conclusiones",
    method1Text:
      "Los perfiles provienen de un directorio público con enlaces oficiales. Cada declaración, voto o acción que se incorpore debe enlazar su evidencia y conservar el contexto.",
    method2: "Sin puntuaciones políticas",
    method2Text:
      "No recomendamos candidatos ni asignamos una nota de integridad. Las declaraciones y los votos se muestran por separado: un voto requiere leer la medida y su contexto.",
    method3: "Lo desconocido se queda desconocido",
    method3Text:
      "Si un registro falta, lo mostramos. Una candidatura histórica no es una candidatura activa. Los datos públicos pueden contener errores: contrasta siempre la fuente original.",
    close: "Cerrar",
    loading: "Preparando el directorio…",
    loadError: "No pudimos cargar el directorio.",
    retry: "Volver a intentar",
    compareLimit: "Puedes comparar hasta tres personas.",
    added: "Añadido a tu seguimiento",
    removed: "Eliminado de tu seguimiento",
    exportEmpty: "Selecciona perfiles para exportar.",
    candidateEmpty: "Las candidaturas necesitan su propia fuente",
    candidateEmptyText:
      "Todavía no hay candidaturas incorporadas. Una lista electoral se publicará con el año de la elección y su procedencia; no inferimos quién está aspirando a un cargo.",
    browse: "Explorar perfiles",
    sourceDate: "Última instantánea",
    local: "Guardado en este navegador",
    recordsLabel: "Evidencia pública",
    peopleLabel: "Personas",
    menu: "Abrir menú",
    remove: "Quitar",
    shown: "Mostrando",
    selected: "seleccionados",
    profileSources: "Fuentes del perfil",
    noDate: "Fecha no registrada",
    noComparison: "Sin registros importados",
    trustLabel: "DATOS ABIERTOS · CRITERIO PROPIO",
    island: "PUERTO RICO",
    sort: "Ordenar perfiles",
    view: "Vista",
    table: "Lista",
    grid: "Tarjetas",
  },
  en: {
    explore: "Explore",
    saved: "My watchlist",
    compare: "Compare",
    sources: "Sources & coverage",
    guide: "How it works",
    tagline: "More information. Better decisions.",
    navLabel: "YOUR CIVIC SPACE",
    independent: "Independent. Always.",
    territory: "Made for Puerto Rico",
    breadcrumb: "Your voice starts with information.",
    intro: "INFORMATION FOR YOUR DECISION",
    hero1: "Your vote deserves",
    hero2: "the whole picture.",
    sub: "Get to know your representatives. Explore their positions, check the evidence, and make up your own mind.",
    mapTitle: "One island. Many voices.",
    mapSub: "78 municipalities · one public conversation",
    people: "Public profiles",
    institutions: "Institutions",
    evidence: "Evidence records",
    following: "People you follow",
    section: "Know who speaks for you",
    sectionSub: "People, public records, and sources. All in one place.",
    aboutData: "About this data",
    search: "Search a name, municipality, or office…",
    filters: "Filters",
    all: "Everyone",
    officials: "Representatives",
    candidates: "Candidates",
    party: "Party",
    institution: "Institution",
    issue: "Issue with evidence",
    allParties: "All parties",
    allInstitutions: "All institutions",
    allIssues: "All issues",
    senate: "Senate",
    house: "House",
    executive: "Executive",
    federal: "Federal",
    "disaster-preparedness": "Disaster preparedness",
    infrastructure: "Infrastructure",
    energy: "Energy",
    health: "Health",
    education: "Education",
    economy: "Economy",
    governance: "Governance",
    status: "Political status",
    results: "profiles",
    nameSort: "Name: A–Z",
    officeSort: "By institution",
    sourceLinked: "Sourced profile",
    viewProfile: "View profile",
    follow: "Follow",
    unfollow: "Unfollow",
    evidenceCount: "records",
    noEvidence: "Evidence not yet imported",
    comparePerson: "Compare",
    clear: "Clear filters",
    empty: "No profiles found",
    emptySub: "Try another name or broaden the filters to keep exploring.",
    savedTitle: "Your civic radar",
    savedSub:
      "Follow the people you care about. Your selections are saved in this browser.",
    noSaved: "Your radar starts with you",
    noSavedSub:
      "Bookmark a profile to find it here. We do not send alerts or create an account.",
    compareTitle: "The evidence, side by side",
    compareSub:
      "Compare up to three people. Missing records do not mean support or opposition.",
    chooseCompare: "Choose at least two profiles",
    chooseCompareSub:
      "Use “Compare” on profile cards to build your own comparison.",
    export: "Export CSV",
    sourcesTitle: "Trust starts at the source",
    sourcesSub:
      "See where the data comes from, when it was retrieved, and what we still need to add.",
    refresh: "Refresh directory",
    refreshing: "Refreshing…",
    coverage: "Initial directory coverage",
    coverageText:
      "Puerto Rico profiles from the Open States civic registry. This is not a complete census or a certified candidate list. Affiliations and offices may change.",
    gapTitle: "What we do not yet know",
    gapText:
      "No roll-call votes or policy positions have been imported yet. We never attribute positions based on party. Candidates are added with their election year and source.",
    fullSources: "Open source",
    snapshot: "Snapshot",
    live: "Updated",
    blocked: "Access blocked",
    error: "Refresh failed",
    not_connected: "Not directly connected",
    retrieved: "Retrieved",
    unknown: "Not verified",
    profile: "Public profile",
    record: "Evidence record",
    statements: "What they say",
    actions: "What they do",
    votes: "Votes",
    allRecords: "Full record",
    noRecords: "No evidence imported yet",
    noRecordsSub:
      "This profile has directory information, but no statements, votes, or actions have been imported yet. Visit the original sources to investigate.",
    officialLink: "View original profile",
    provenance: "Profile provenance",
    updated: "Snapshot from",
    historical: "Historical candidacy",
    former: "Former official",
    partialCoverage:
      "Imported evidence is partial. Read each source and its context. Issues without records remain undetermined; they do not imply support or opposition.",
    emptyCategory: "No records in this category",
    emptyCategorySub:
      "This profile has evidence in other categories. Choose Full record to see it.",
    election: "Election",
    current: "Public official",
    source: "Source",
    context: "Context",
    original: "Original text",
    supports: "Supports",
    opposes: "Opposes",
    not_recorded: "Position not determined",
    reviewed: "Checked against source",
    source_linked: "Source linked",
    footnote: "The evidence informs. You decide.",
    footerSub: "An independent civic project for Puerto Rico.",
    methodology: "Our methodology",
    methodTitle: "Less noise. More context.",
    method1: "Sources before conclusions",
    method1Text:
      "Profiles come from a public registry with official links. Each imported statement, vote, or action must link its evidence and preserve context.",
    method2: "No political scores",
    method2Text:
      "We do not recommend candidates or assign integrity scores. Statements and votes appear separately: understanding a vote requires reading the measure and its context.",
    method3: "Unknown stays unknown",
    method3Text:
      "We show gaps. A historical candidacy is not an active candidacy. Public data can contain errors: always check the original source.",
    close: "Close",
    loading: "Preparing the directory…",
    loadError: "We could not load the directory.",
    retry: "Try again",
    compareLimit: "You can compare up to three people.",
    added: "Added to your watchlist",
    removed: "Removed from your watchlist",
    exportEmpty: "Select profiles to export.",
    candidateEmpty: "Candidates need a source of their own",
    candidateEmptyText:
      "No candidates have been imported yet. Any election list will include its election year and provenance; we do not infer who is running for office.",
    browse: "Explore profiles",
    sourceDate: "Latest snapshot",
    local: "Saved in this browser",
    recordsLabel: "Public evidence",
    peopleLabel: "People",
    menu: "Open menu",
    remove: "Remove",
    shown: "Showing",
    selected: "selected",
    profileSources: "Profile sources",
    noDate: "Date not recorded",
    noComparison: "No imported records",
    trustLabel: "OPEN DATA · YOUR OWN JUDGMENT",
    island: "PUERTO RICO",
    sort: "Sort profiles",
    view: "View",
    table: "List",
    grid: "Cards",
  },
};
const partyNames: Record<string, string> = {
  PNP: "Partido Nuevo Progresista",
  PPD: "Partido Popular Democrático",
  PIP: "Partido Independentista Puertorriqueño",
  MVC: "Movimiento Victoria Ciudadana",
  PD: "Proyecto Dignidad",
  IND: "Independiente",
};
function readStored<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}
function initialLetters(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  return [
    parts[0]?.[0],
    parts.length > 1 ? parts[parts.length - 1][0] : "",
  ].join("");
}
function dateText(date: string | null | undefined, lang: Lang) {
  if (!date) return "—";
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? "—"
    : parsed.toLocaleDateString(lang === "es" ? "es-PR" : "en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      });
}
function PuertoRicoMap() {
  return (
    <svg
      className="island-map"
      viewBox="0 0 460 190"
      role="img"
      aria-label="Puerto Rico"
    >
      <defs>
        <pattern
          id="mapdots"
          width="13"
          height="13"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="2" cy="2" r="1" fill="#638c78" opacity=".18" />
        </pattern>
        <linearGradient id="islandFill" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#b8d2bd" />
          <stop offset="1" stopColor="#d4dfc8" />
        </linearGradient>
      </defs>
      <rect width="460" height="190" fill="url(#mapdots)" />
      <path
        d="M50 65L77 50 115 47 139 39 180 43 210 36 249 42 284 39 319 49 349 48 373 62 397 62 410 77 398 94 380 99 375 118 356 131 329 132 304 142 272 137 240 145 205 138 172 144 147 135 114 140 92 129 65 130 58 112 46 100 49 86 38 77Z"
        fill="url(#islandFill)"
        stroke="#9bbda4"
        strokeWidth="1.5"
      />
      <path
        d="M108 50l6 90m57-96l1 100m67-102l1 103m63-102l1 99m48-92l-6 83M48 94l350 0"
        stroke="#eef3e7"
        strokeWidth="1.2"
        strokeDasharray="3 4"
      />
      <path
        d="M417 119l15-4 9 7-5 7-16-2zM411 150l24-6 12 8-13 7-22-2z"
        fill="#bdcfb7"
      />
      <circle cx="304" cy="54" r="12" fill="#14725c" opacity=".1" />
      <circle
        cx="304"
        cy="54"
        r="5"
        fill="#14725c"
        stroke="#f3f6e9"
        strokeWidth="2"
      />
      <circle
        cx="74"
        cy="85"
        r="4"
        fill="#73977f"
        stroke="#eaf0de"
        strokeWidth="2"
      />
      <circle
        cx="206"
        cy="129"
        r="4"
        fill="#73977f"
        stroke="#eaf0de"
        strokeWidth="2"
      />
      <text x="311" y="38" fill="#496a54" fontSize="10" fontFamily="sans-serif">
        San Juan
      </text>
      <text x="42" y="108" fill="#496a54" fontSize="10" fontFamily="sans-serif">
        Mayagüez
      </text>
      <text
        x="214"
        y="127"
        fill="#496a54"
        fontSize="10"
        fontFamily="sans-serif"
      >
        Ponce
      </text>
    </svg>
  );
}
function Modal({
  children,
  onClose,
  label,
  wide = false,
}: {
  children: ReactNode;
  onClose: () => void;
  label: string;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const before = document.activeElement as HTMLElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusables = () =>
      Array.from(
        ref.current?.querySelectorAll<HTMLElement>(
          'button,a[href],select,input,[tabindex="0"]',
        ) || [],
      ).filter(
        (item) =>
          !item.hasAttribute("disabled") && item.getClientRects().length > 0,
      );
    (focusables()[0] || ref.current)?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeRef.current();
      }
      if (e.key === "Tab") {
        const items = focusables();
        if (!items.length) {
          e.preventDefault();
          ref.current?.focus();
          return;
        }
        const first = items[0],
          last = items[items.length - 1],
          active = document.activeElement;
        const outside =
          !ref.current?.contains(active) || active === ref.current;
        if (e.shiftKey && (active === first || outside)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (active === last || outside)) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener("keydown", key);
      if (before?.isConnected) before.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`modal ${wide ? "wide" : ""}`}
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  );
}
export default function App() {
  const [lang, setLang] = useState<Lang>(() =>
    readStored<unknown>("vc.lang", "es") === "en" ? "en" : "es",
  );
  const t = copy[lang];
  const [data, setData] = useState<Dataset | null>(null),
    [loadError, setLoadError] = useState(false);
  const [page, setPage] = useState<Page>("explore");
  const [query, setQuery] = useState(""),
    [kind, setKind] = useState("all"),
    [party, setParty] = useState("all"),
    [chamber, setChamber] = useState("all"),
    [issue, setIssue] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false),
    [listView, setListView] = useState(false),
    [sort, setSort] = useState("name");
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    const v = readStored<unknown>("vc.watchlist", []);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  });
  const [comparison, setComparison] = useState<string[]>([]),
    [profile, setProfile] = useState<Person | null>(null),
    [recordType, setRecordType] = useState("all");
  const [method, setMethod] = useState(false),
    [mobileNav, setMobileNav] = useState(false),
    [syncing, setSyncing] = useState(false),
    [toast, setToast] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!mobileNav) return;
    const before = document.activeElement as HTMLElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const items = () =>
      Array.from(
        sidebarRef.current?.querySelectorAll<HTMLElement>("button,a[href]") ||
          [],
      ).filter((el) => el.getClientRects().length > 0);
    items()[0]?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileNav(false);
      }
      if (event.key === "Tab") {
        const controls = items();
        const first = controls[0],
          last = controls[controls.length - 1];
        if (!first) return;
        const outside = !sidebarRef.current?.contains(document.activeElement);
        if (event.shiftKey && (document.activeElement === first || outside)) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last || outside)
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener("keydown", key);
      if (before?.isConnected) before.focus();
    };
  }, [mobileNav]);
  async function load() {
    setLoadError(false);
    try {
      const res = await fetch("/api/data");
      if (!res.ok) throw new Error("load");
      const result: Dataset = await res.json();
      if (!Array.isArray(result.people)) throw new Error("schema");
      setData(result);
    } catch {
      setLoadError(true);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("vc.watchlist", JSON.stringify(watchlist));
    } catch {
      /* Browser storage may be disabled. */
    }
  }, [watchlist]);
  useEffect(() => {
    try {
      localStorage.setItem("vc.lang", JSON.stringify(lang));
    } catch {
      /* Language still applies for this visit. */
    }
    document.documentElement.lang = lang;
  }, [lang]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPage("explore");
        setTimeout(() => searchRef.current?.focus(), 10);
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, []);
  const filtered = useMemo(
    () =>
      filterPeople(
        data?.people || [],
        {
          query,
          kind,
          party,
          chamber,
          issue,
          watchlist,
          onlyFollowed: page === "saved",
        },
        data?.evidence || [],
      ).sort((a, b) =>
        sort === "name"
          ? a.name.localeCompare(b.name, "es")
          : a.chamber.localeCompare(b.chamber) ||
            a.name.localeCompare(b.name, "es"),
      ),
    [data, query, kind, party, chamber, issue, watchlist, page, sort],
  );
  const selected = (data?.people || []).filter((p) =>
    comparison.includes(p.id),
  );
  function navigate(next: Page) {
    setPage(next);
    setMobileNav(false);
    setQuery("");
    setKind("all");
    setParty("all");
    setChamber("all");
    setIssue("all");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function follow(id: string) {
    setWatchlist((prev) => toggleSelection(prev, id));
    setToast(watchlist.includes(id) ? t.removed : t.added);
  }
  function compare(id: string) {
    if (!comparison.includes(id) && comparison.length >= 3) {
      setToast(t.compareLimit);
      return;
    }
    setComparison((prev) => toggleSelection(prev, id, 3));
  }
  function clear() {
    setQuery("");
    setKind("all");
    setParty("all");
    setChamber("all");
    setIssue("all");
  }
  async function sync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const result = await res.json();
      if (Array.isArray(result.people)) setData(result);
      if (!res.ok)
        throw new Error(
          result.sync?.message || result.error || "Refresh failed",
        );
      setToast(
        result.sync?.message ||
          (lang === "es" ? "Directorio actualizado." : "Directory updated."),
      );
    } catch (error) {
      setToast(String(error instanceof Error ? error.message : error));
    } finally {
      setSyncing(false);
    }
  }
  function exportPeople(ids: string[]) {
    if (!ids.length) {
      setToast(t.exportEmpty);
      return;
    }
    const qs = new URLSearchParams();
    ids.forEach((id) => qs.append("id", id));
    const anchor = document.createElement("a");
    anchor.href = `/api/export.csv?${qs}`;
    anchor.download = "voto-claro.csv";
    anchor.click();
  }
  function openProfile(person: Person) {
    setRecordType("all");
    setProfile(person);
  }
  const partyChoices = Array.from(
    new Set([
      ...Object.keys(partyNames),
      ...(data?.people.map((p) => p.party) || []),
    ]),
  );
  const issueChoices = Array.from(
    new Set([
      "energy",
      "health",
      "education",
      "economy",
      "governance",
      "status",
      ...(data?.evidence.map((e) => e.issue) || []),
    ]),
  );
  const activeFilters = party !== "all" || chamber !== "all" || issue !== "all";
  const locationLabel = (person: Person) =>
    ["acumulacion", "acumulación", "at-large", "0"].includes(
      person.district?.toLowerCase() || "",
    )
      ? lang === "es"
        ? "Por acumulación"
        : "At large"
      : person.district
        ? `${lang === "es" ? "Distrito" : "District"} ${person.district}`
        : person.municipality || "Puerto Rico";
  const institutionLabel = (value: string) =>
    value === "senate"
      ? t.senate
      : value === "house"
        ? t.house
        : value === "executive"
          ? t.executive
          : value === "federal"
            ? t.federal
            : t.candidates;
  const navItems = [
    { id: "explore" as Page, label: t.explore, icon: Compass },
    { id: "saved" as Page, label: t.saved, icon: Bookmark },
    { id: "compare" as Page, label: t.compare, icon: Scale },
    { id: "sources" as Page, label: t.sources, icon: FileCheck2 },
  ];
  const evidenceFor = (id: string) =>
    data?.evidence.filter((e) => e.personId === id) || [];
  const empty = (
    icon: ReactNode,
    title: string,
    text: string,
    button?: boolean,
  ) => (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
      {button && (
        <button className="button primary" onClick={() => navigate("explore")}>
          {t.browse}
          <ArrowRight size={16} />
        </button>
      )}
    </div>
  );
  return (
    <div className="app-shell">
      {mobileNav && (
        <div className="nav-shade" onClick={() => setMobileNav(false)} />
      )}
      <aside
        id="primary-sidebar"
        ref={sidebarRef}
        aria-label={lang === "es" ? "Navegación principal" : "Main navigation"}
        className={`sidebar ${mobileNav ? "is-open" : ""}`}
      >
        <button
          className="brand"
          onClick={() => navigate("explore")}
          aria-label="Voto Claro"
        >
          <span className="brand-icon">
            <Check size={25} strokeWidth={3} />
          </span>
          <span>
            voto<span className="brand-light">claro</span>
            <small>PUERTO RICO</small>
          </span>
        </button>
        <div className="sidebar-divider" />
        <p className="nav-label">{t.navLabel}</p>
        <nav>
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${page === id ? "active" : ""}`}
              onClick={() => navigate(id)}
            >
              <Icon size={19} />
              <span>{label}</span>
              {id === "saved" && watchlist.length > 0 && (
                <b>{watchlist.length}</b>
              )}
              {id === "compare" && comparison.length > 0 && (
                <b>{comparison.length}</b>
              )}
              {page === id && <span className="nav-active-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <div className="note-spark">✳</div>
          <h3>
            {lang === "es"
              ? "Tu criterio es lo que cuenta."
              : "Your judgment matters."}
          </h3>
          <p>
            {lang === "es"
              ? "Nosotros reunimos las fuentes. La decisión es tuya."
              : "We bring the sources together. The decision is yours."}
          </p>
          <button onClick={() => setMethod(true)}>
            {t.guide}
            <ArrowUpRight size={15} />
          </button>
        </div>
        <div className="sidebar-bottom">
          <button onClick={() => setMethod(true)}>
            <CircleHelp size={17} />
            {t.methodology}
          </button>
          <div>
            <ShieldCheck size={15} />
            <span>{t.independent}</span>
          </div>
          <small>© {new Date().getFullYear()} Voto Claro</small>
        </div>
      </aside>
      <div className="main-shell" inert={mobileNav}>
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu"
              aria-label={t.menu}
              aria-controls="primary-sidebar"
              aria-expanded={mobileNav}
              onClick={() => setMobileNav(!mobileNav)}
            >
              <Menu size={22} />
            </button>
            <span className="breadcrumb-dot" />
            {t.breadcrumb}
          </div>
          <div className="topbar-right">
            <span className="region">
              <span className="pr-flag">
                <i />★
              </span>
              Puerto Rico
            </span>
            <span className="topbar-separator" />
            <button
              className="lang-button"
              onClick={() => setLang(lang === "es" ? "en" : "es")}
              aria-label={
                lang === "es" ? "Switch to English" : "Cambiar a español"
              }
            >
              <Globe2 size={15} />
              {lang.toUpperCase()}
              <ChevronDown size={12} />
            </button>
            <span className="civic-avatar" aria-label={t.territory}>
              <Vote size={18} />
            </span>
          </div>
        </header>
        <main>
          {page === "explore" && (
            <>
              <section className="hero">
                <div className="hero-text">
                  <div className="eyebrow">
                    <span />
                    {t.intro}
                  </div>
                  <h1>
                    {t.hero1}
                    <br />
                    <em>{t.hero2}</em>
                  </h1>
                  <p>{t.sub}</p>
                  <span className="trust-caption">
                    <ShieldCheck size={14} />
                    {t.trustLabel}
                  </span>
                </div>
                <div className="hero-map">
                  <div className="map-coordinate">
                    18° 13′ N &nbsp; 66° 26′ O
                    <span>
                      <MapPin size={11} />
                      {t.island}
                    </span>
                  </div>
                  <PuertoRicoMap />
                  <div className="map-caption">
                    <span className="map-cross">+</span>
                    <div>
                      <strong>{t.mapTitle}</strong>
                      <p>{t.mapSub}</p>
                    </div>
                    <span className="map-cross">+</span>
                  </div>
                </div>
              </section>
              <section className="stats" aria-label={t.coverage}>
                {[
                  {
                    label: t.people,
                    value: data?.people.length ?? "—",
                    icon: UsersRound,
                    detail:
                      lang === "es"
                        ? "Directorio inicial"
                        : "Initial directory",
                  },
                  {
                    label: t.institutions,
                    value: data
                      ? new Set(
                          data.people
                            .filter((p) => p.kind === "official")
                            .map((p) => p.chamber),
                        ).size
                      : "—",
                    icon: Landmark,
                    detail: "Puerto Rico",
                  },
                  {
                    label: t.evidence,
                    value: data?.evidence.length ?? "—",
                    icon: FileCheck2,
                    detail:
                      lang === "es"
                        ? "Con fuente y contexto"
                        : "With sources & context",
                  },
                  {
                    label: t.following,
                    value: watchlist.length,
                    icon: Bookmark,
                    detail: t.local,
                  },
                ].map((stat, i) => (
                  <button
                    className="stat"
                    key={stat.label}
                    onClick={() =>
                      i === 3
                        ? navigate("saved")
                        : i === 2
                          ? navigate("sources")
                          : document
                              .getElementById("directory")
                              ?.scrollIntoView({ behavior: "smooth" })
                    }
                  >
                    <div className="stat-top">
                      <span>{stat.label}</span>
                      <stat.icon size={17} />
                    </div>
                    <div className="stat-bottom">
                      <strong>{stat.value}</strong>
                      <small>{stat.detail}</small>
                    </div>
                  </button>
                ))}
              </section>
            </>
          )}
          {(page === "explore" || page === "saved") && (
            <section className="directory" id="directory">
              <div className="section-heading">
                <div>
                  <div className="eyebrow compact">
                    {page === "saved"
                      ? t.local
                      : lang === "es"
                        ? "DIRECTORIO PÚBLICO"
                        : "PUBLIC DIRECTORY"}
                  </div>
                  <h2>{page === "saved" ? t.savedTitle : t.section}</h2>
                  <p>{page === "saved" ? t.savedSub : t.sectionSub}</p>
                </div>
                <button
                  className="text-button"
                  onClick={() => navigate("sources")}
                >
                  {t.aboutData}
                  <ArrowUpRight size={15} />
                </button>
              </div>
              <div className="search-row">
                <div className="searchbox">
                  <Search size={20} />
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    aria-label={t.search}
                    placeholder={t.search}
                  />
                  {query ? (
                    <button
                      className="icon-button"
                      onClick={() => setQuery("")}
                      aria-label={t.clear}
                    >
                      <X size={16} />
                    </button>
                  ) : (
                    <kbd>⌘ K</kbd>
                  )}
                </div>
                <button
                  className={`button filter-button ${filtersOpen || activeFilters ? "selected" : ""}`}
                  aria-expanded={filtersOpen}
                  onClick={() => setFiltersOpen(!filtersOpen)}
                >
                  <SlidersHorizontal size={17} />
                  {t.filters}
                  {activeFilters && <span className="filter-dot" />}
                </button>
              </div>
              {filtersOpen && (
                <div className="filter-panel">
                  <label>
                    {t.party}
                    <select
                      aria-label={t.party}
                      value={party}
                      onChange={(e) => setParty(e.target.value)}
                    >
                      <option value="all">{t.allParties}</option>
                      {partyChoices.map((p) => (
                        <option key={p} value={p}>
                          {p}
                          {partyNames[p] ? ` · ${partyNames[p]}` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {t.institution}
                    <select
                      aria-label={t.institution}
                      value={chamber}
                      onChange={(e) => setChamber(e.target.value)}
                    >
                      <option value="all">{t.allInstitutions}</option>
                      {[
                        "senate",
                        "house",
                        "executive",
                        "federal",
                        "candidate",
                      ].map((c) => (
                        <option key={c} value={c}>
                          {institutionLabel(c)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {t.issue}
                    <select
                      aria-label={t.issue}
                      value={issue}
                      onChange={(e) => setIssue(e.target.value)}
                    >
                      <option value="all">{t.allIssues}</option>
                      {issueChoices.map((i) => (
                        <option key={i} value={i}>
                          {t[i as keyof typeof t] || i}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button className="text-button" onClick={clear}>
                    {t.clear}
                    <X size={13} />
                  </button>
                </div>
              )}
              <div className="directory-toolbar">
                <div className="tabs" role="tablist" aria-label={t.peopleLabel}>
                  {[
                    { id: "all", label: t.all },
                    { id: "official", label: t.officials },
                    { id: "candidate", label: t.candidates },
                  ].map((tab) => (
                    <button
                      role="tab"
                      aria-selected={kind === tab.id}
                      key={tab.id}
                      onClick={() => setKind(tab.id)}
                      className={kind === tab.id ? "active" : ""}
                    >
                      {tab.label}
                      <span>
                        {data?.people.filter(
                          (p) => tab.id === "all" || p.kind === tab.id,
                        ).length ?? 0}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="view-controls">
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    aria-label={t.sort}
                  >
                    <option value="name">{t.nameSort}</option>
                    <option value="office">{t.officeSort}</option>
                  </select>
                  <div className="view-toggle">
                    <button
                      className={!listView ? "active" : ""}
                      aria-label={t.grid}
                      aria-pressed={!listView}
                      onClick={() => setListView(false)}
                    >
                      <LayoutGrid size={16} />
                    </button>
                    <button
                      className={listView ? "active" : ""}
                      aria-label={t.table}
                      aria-pressed={listView}
                      onClick={() => setListView(true)}
                    >
                      <List size={17} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="results-line">
                <span>
                  {t.shown} <strong>{filtered.length}</strong> {t.results}
                  {activeFilters && <button onClick={clear}>{t.clear}</button>}
                </span>
                <span>
                  <span className="tiny-dot" />
                  {t.sourceDate}: {dateText(data?.lastUpdated, lang)}
                </span>
              </div>
              {!data && !loadError && (
                <div className="loading">
                  <LoaderCircle className="spin" />
                  {t.loading}
                </div>
              )}
              {loadError && (
                <div className="empty-state">
                  <h3>{t.loadError}</h3>
                  <button className="button" onClick={load}>
                    {t.retry}
                  </button>
                </div>
              )}
              {data &&
                filtered.length === 0 &&
                (page === "saved" && watchlist.length === 0 ? (
                  empty(<Bookmark size={28} />, t.noSaved, t.noSavedSub, true)
                ) : kind === "candidate" &&
                  !data.people.some((p) => p.kind === "candidate") ? (
                  empty(
                    <Vote size={28} />,
                    t.candidateEmpty,
                    t.candidateEmptyText,
                  )
                ) : (
                  <div>
                    {empty(<Search size={28} />, t.empty, t.emptySub)}
                    <button className="text-button centered" onClick={clear}>
                      {t.clear}
                      <ArrowRight size={15} />
                    </button>
                  </div>
                ))}
              <div className={`people-grid ${listView ? "list-view" : ""}`}>
                {filtered.map((person) => {
                  const records = evidenceFor(person.id);
                  return (
                    <article className="person-card" key={person.id}>
                      <div className="card-main">
                        <div className="card-top">
                          <button
                            className={`person-avatar party-${person.party}`}
                            onClick={() => openProfile(person)}
                            aria-label={`${t.viewProfile}: ${person.name}`}
                          >
                            {initialLetters(person.name)}
                            <span className="avatar-mark">
                              <Landmark size={10} />
                            </span>
                          </button>
                          <span
                            className={`party-badge party-${person.party}`}
                            title={partyNames[person.party] || person.party}
                          >
                            <span />
                            {person.party}
                          </span>
                          <button
                            className="icon-button card-arrow"
                            aria-label={`${t.viewProfile}: ${person.name}`}
                            onClick={() => openProfile(person)}
                          >
                            <ArrowUpRight size={19} />
                          </button>
                        </div>
                        <button
                          className="person-name"
                          onClick={() => openProfile(person)}
                        >
                          <h3>{person.name}</h3>
                        </button>
                        <p className="person-office">{person.office}</p>
                        <p className="person-location">
                          <MapPin size={12} />
                          {locationLabel(person)}
                        </p>
                        {(person.kind === "candidate" ||
                          person.status === "historical") && (
                          <span className="historical-label">
                            {person.kind === "candidate"
                              ? `${person.status === "historical" ? t.historical : t.election} · ${person.electionYear}`
                              : t.former}
                          </span>
                        )}
                        <div className="source-hint">
                          <span className="tiny-dot" />
                          {t.sourceLinked}
                          <span className="records-hint">
                            {records.length
                              ? `${records.length} ${t.evidenceCount}`
                              : t.noEvidence}
                          </span>
                        </div>
                      </div>
                      <div className="card-footer">
                        <button
                          className={`compare-button ${comparison.includes(person.id) ? "is-selected" : ""}`}
                          onClick={() => compare(person.id)}
                          aria-pressed={comparison.includes(person.id)}
                        >
                          {comparison.includes(person.id) ? (
                            <Check size={14} />
                          ) : (
                            <Plus size={14} />
                          )}{" "}
                          {t.comparePerson}
                        </button>
                        <button
                          className={`follow-button ${watchlist.includes(person.id) ? "is-followed" : ""}`}
                          aria-label={`${watchlist.includes(person.id) ? t.unfollow : t.follow}: ${person.name}`}
                          title={
                            watchlist.includes(person.id)
                              ? t.unfollow
                              : t.follow
                          }
                          onClick={() => follow(person.id)}
                          aria-pressed={watchlist.includes(person.id)}
                        >
                          <Bookmark
                            size={17}
                            fill={
                              watchlist.includes(person.id)
                                ? "currentColor"
                                : "none"
                            }
                          />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
              {filtered.length > 0 && (
                <div className="directory-bottom">
                  <span>
                    <ShieldCheck size={14} />
                    {lang === "es"
                      ? "Datos con procedencia. Sin puntuaciones políticas."
                      : "Sourced data. No political scores."}
                  </span>
                  <button
                    className="text-button"
                    onClick={() => exportPeople(filtered.map((p) => p.id))}
                  >
                    <ArrowDownToLine size={15} />
                    {t.export}
                  </button>
                </div>
              )}
              <div className="coverage-banner">
                <div className="coverage-icon">
                  <FileText size={21} />
                </div>
                <div>
                  <h3>{t.gapTitle}</h3>
                  <p>
                    {(data?.evidence.length || 0) > 0
                      ? t.partialCoverage
                      : t.gapText}
                  </p>
                </div>
                <button
                  className="icon-button"
                  onClick={() => navigate("sources")}
                  aria-label={t.aboutData}
                >
                  <ArrowRight size={20} />
                </button>
              </div>
            </section>
          )}
          {page === "compare" && (
            <section className="page-section">
              <div className="section-heading">
                <div>
                  <div className="eyebrow compact">
                    {lang === "es"
                      ? "TU PROPIA PERSPECTIVA"
                      : "YOUR OWN PERSPECTIVE"}
                  </div>
                  <h1 className="page-title">{t.compareTitle}</h1>
                  <p>{t.compareSub}</p>
                </div>
                {selected.length > 0 && (
                  <button
                    className="button"
                    onClick={() => exportPeople(comparison)}
                  >
                    <ArrowDownToLine size={16} />
                    {t.export}
                  </button>
                )}
              </div>
              {selected.length < 2 ? (
                empty(
                  <Scale size={30} />,
                  t.chooseCompare,
                  t.chooseCompareSub,
                  true,
                )
              ) : (
                <div className="comparison-table">
                  <table>
                    <thead>
                      <tr>
                        <th>{t.profile}</th>
                        {selected.map((p) => (
                          <th key={p.id}>
                            <div
                              className={`person-avatar small party-${p.party}`}
                            >
                              {initialLetters(p.name)}
                            </div>
                            <button
                              className="comparison-name"
                              onClick={() => openProfile(p)}
                            >
                              {p.name}
                              <ArrowUpRight size={13} />
                            </button>
                            <button
                              className="text-button remove-compare"
                              onClick={() => compare(p.id)}
                            >
                              {t.remove}
                              <X size={12} />
                            </button>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <th>{t.party}</th>
                        {selected.map((p) => (
                          <td key={p.id}>
                            <span className={`party-badge party-${p.party}`}>
                              {p.party}
                            </span>
                            <small>{partyNames[p.party]}</small>
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <th>{t.institution}</th>
                        {selected.map((p) => (
                          <td key={p.id}>
                            {p.office}
                            <small>
                              {p.municipality}
                              {p.district ? ` · ${p.district}` : ""}
                            </small>
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <th>{t.election}</th>
                        {selected.map((p) => (
                          <td key={p.id}>
                            {p.kind === "candidate"
                              ? `${p.electionYear} · ${p.status === "historical" ? t.historical : t.candidates}`
                              : p.status === "historical"
                                ? t.former
                                : t.current}
                          </td>
                        ))}
                      </tr>
                      {(["statement", "vote", "action"] as const).map(
                        (type) => (
                          <tr key={type}>
                            <th>
                              {type === "statement"
                                ? t.statements
                                : type === "vote"
                                  ? t.votes
                                  : t.actions}
                            </th>
                            {selected.map((p) => {
                              const rows = evidenceFor(p.id).filter(
                                (e) => e.type === type,
                              );
                              return (
                                <td key={p.id}>
                                  {rows.length ? (
                                    rows.map((row) => (
                                      <a
                                        key={row.id}
                                        href={row.sourceUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        {row.title}
                                        <ExternalLink size={12} />
                                      </a>
                                    ))
                                  ) : (
                                    <span className="unknown-record">
                                      —<small>{t.noComparison}</small>
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ),
                      )}
                      <tr>
                        <th>{t.source}</th>
                        {selected.map((p) => (
                          <td key={p.id}>
                            <a
                              href={p.officialUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {t.officialLink}
                              <ExternalLink size={12} />
                            </a>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
              {selected.length > 0 && selected.length < 2 && (
                <div className="selected-chips">
                  {selected.map((p) => (
                    <button key={p.id} onClick={() => compare(p.id)}>
                      {p.name}
                      <X size={14} />
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}
          {page === "sources" && (
            <section className="page-section">
              <div className="section-heading">
                <div>
                  <div className="eyebrow compact">
                    {lang === "es"
                      ? "TRANSPARENCIA POR DISEÑO"
                      : "TRANSPARENCY BY DESIGN"}
                  </div>
                  <h1 className="page-title">{t.sourcesTitle}</h1>
                  <p>{t.sourcesSub}</p>
                </div>
                <button
                  className="button primary"
                  onClick={sync}
                  disabled={syncing}
                >
                  <RefreshCw size={16} className={syncing ? "spin" : ""} />
                  {syncing ? t.refreshing : t.refresh}
                </button>
              </div>
              <div className="source-intro">
                <ShieldCheck size={25} />
                <div>
                  <h3>{t.coverage}</h3>
                  <p>{t.coverageText}</p>
                </div>
              </div>
              <div className="source-grid">
                {data?.sources.map((source) => (
                  <article className="source-card" key={source.id}>
                    <div className="source-card-top">
                      <div className="source-logo">
                        {source.kind === "registry" ? (
                          <UsersRound size={23} />
                        ) : source.kind === "election" ? (
                          <Vote size={23} />
                        ) : (
                          <Landmark size={23} />
                        )}
                      </div>
                      <span className={`status-badge status-${source.status}`}>
                        <span />
                        {t[source.status as keyof typeof t] || source.status}
                      </span>
                    </div>
                    <h3>{source.name}</h3>
                    <p>{source.description}</p>
                    {source.error && (
                      <p className="source-error">{source.error}</p>
                    )}
                    <div className="source-card-footer">
                      <span>
                        {t.retrieved}:{" "}
                        {source.lastFetched
                          ? dateText(source.lastFetched, lang)
                          : t.unknown}
                      </span>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`${t.fullSources}: ${source.name}`}
                      >
                        <ArrowUpRight size={18} />
                      </a>
                    </div>
                  </article>
                ))}
              </div>
              <div className="coverage-banner">
                <div className="coverage-icon">
                  <FileText size={21} />
                </div>
                <div>
                  <h3>{t.gapTitle}</h3>
                  <p>
                    {(data?.evidence.length || 0) > 0
                      ? t.partialCoverage
                      : t.gapText}
                  </p>
                </div>
              </div>
              <button
                className="text-button method-link"
                onClick={() => setMethod(true)}
              >
                {t.methodology}
                <ArrowRight size={16} />
              </button>
            </section>
          )}
          <footer className="footer">
            <span className="footer-brand">
              <span className="footer-check">
                <Check size={12} />
              </span>
              votoclaro<span className="footer-dot">·</span>
              <span>{t.footnote}</span>
            </span>
            <button onClick={() => setMethod(true)}>
              {t.methodology}
              <ArrowUpRight size={12} />
            </button>
          </footer>
        </main>
      </div>
      {comparison.length > 0 && page !== "compare" && (
        <div className="comparison-bar">
          <span className="comparison-bar-icon">
            <Scale size={21} />
          </span>
          <div>
            <strong>
              {comparison.length} {t.selected}
            </strong>
            <small>
              {selected.map((p) => p.name.split(" ")[0]).join(" · ")}
            </small>
          </div>
          <button
            className="button primary"
            onClick={() => navigate("compare")}
          >
            {t.compare}
            <ArrowRight size={16} />
          </button>
          <button
            className="icon-button"
            onClick={() => setComparison([])}
            aria-label={t.clear}
          >
            <X size={18} />
          </button>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          <span>{toast}</span>
          <button
            className="icon-button"
            onClick={() => setToast("")}
            aria-label={t.close}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {profile && (
        <Modal onClose={() => setProfile(null)} label={profile.name}>
          <div className="modal-top">
            <span>
              <Landmark size={15} />
              {t.profile}
            </span>
            <button
              className="icon-button"
              aria-label={t.close}
              onClick={() => setProfile(null)}
            >
              <X size={20} />
            </button>
          </div>
          <div className="profile-header">
            <div className={`person-avatar large party-${profile.party}`}>
              {initialLetters(profile.name)}
            </div>
            <div>
              <span className={`party-badge party-${profile.party}`}>
                {profile.party}
              </span>
              <h2>{profile.name}</h2>
              <p>{profile.office}</p>
              <span className="person-location">
                <MapPin size={13} />
                {locationLabel(profile)}
              </span>
            </div>
          </div>
          {(profile.kind === "candidate" ||
            profile.status === "historical") && (
            <p className="profile-candidate">
              {profile.kind === "candidate"
                ? `${profile.status === "historical" ? t.historical : t.candidates} · ${t.election} ${profile.electionYear}`
                : t.former}
            </p>
          )}
          <p className="profile-bio">{profile.biography}</p>
          <div className="profile-actions">
            <button
              className={`button ${watchlist.includes(profile.id) ? "selected" : "primary"}`}
              onClick={() => follow(profile.id)}
            >
              <Bookmark
                size={15}
                fill={watchlist.includes(profile.id) ? "currentColor" : "none"}
              />
              {watchlist.includes(profile.id) ? t.unfollow : t.follow}
            </button>
            <button className="button" onClick={() => compare(profile.id)}>
              <Scale size={16} />
              {comparison.includes(profile.id) ? <Check size={15} /> : null}
              {t.compare}
            </button>
            <a
              className="button original-button"
              href={profile.officialUrl}
              target="_blank"
              rel="noreferrer"
            >
              {t.officialLink}
              <ExternalLink size={14} />
            </a>
          </div>
          <div className="profile-evidence">
            <div className="eyebrow compact">{t.recordsLabel}</div>
            <div className="tabs evidence-tabs">
              {[
                { id: "all", label: t.allRecords },
                { id: "statement", label: t.statements },
                { id: "vote", label: t.votes },
                { id: "action", label: t.actions },
              ].map((item) => (
                <button
                  key={item.id}
                  className={recordType === item.id ? "active" : ""}
                  onClick={() => setRecordType(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {evidenceFor(profile.id).filter(
              (e) => recordType === "all" || e.type === recordType,
            ).length === 0 ? (
              empty(
                <FileText size={25} />,
                evidenceFor(profile.id).length > 0
                  ? t.emptyCategory
                  : t.noRecords,
                evidenceFor(profile.id).length > 0
                  ? t.emptyCategorySub
                  : t.noRecordsSub,
              )
            ) : (
              <div className="evidence-list">
                {evidenceFor(profile.id)
                  .filter((e) => recordType === "all" || e.type === recordType)
                  .map((e) => (
                    <EvidenceCard key={e.id} item={e} lang={lang} />
                  ))}
              </div>
            )}
          </div>
          <div className="profile-provenance">
            <ShieldCheck size={17} />
            <div>
              <strong>{t.provenance}</strong>
              <p>
                {t.updated} {dateText(profile.updatedAt, lang)} ·{" "}
                {profile.sourceIds
                  .map(
                    (id) => data?.sources.find((s) => s.id === id)?.name || id,
                  )
                  .join(", ")}
              </p>
              <div>
                {profile.sourceIds.map((id) => {
                  const source = data?.sources.find((s) => s.id === id);
                  return (
                    source && (
                      <a
                        key={id}
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {source.name}
                        <ExternalLink size={11} />
                      </a>
                    )
                  );
                })}
              </div>
            </div>
          </div>
        </Modal>
      )}
      {method && (
        <Modal onClose={() => setMethod(false)} label={t.methodology}>
          <div className="modal-top">
            <span>
              <ShieldCheck size={16} />
              {t.methodology}
            </span>
            <button
              className="icon-button"
              aria-label={t.close}
              onClick={() => setMethod(false)}
            >
              <X size={20} />
            </button>
          </div>
          <div className="method-content">
            <div className="eyebrow compact">VOTO CLARO · PUERTO RICO</div>
            <h2>{t.methodTitle}</h2>
            {[
              { title: t.method1, text: t.method1Text },
              { title: t.method2, text: t.method2Text },
              { title: t.method3, text: t.method3Text },
            ].map((item, i) => (
              <div className="method-item" key={item.title}>
                <span>0{i + 1}</span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              </div>
            ))}
            <div className="method-bottom">
              <ShieldCheck size={17} />
              {t.footerSub}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
function EvidenceCard({ item, lang }: { item: Evidence; lang: Lang }) {
  const t = copy[lang];
  return (
    <article className="evidence-card">
      <div className="evidence-meta">
        <span>
          {item.type === "statement"
            ? t.statements
            : item.type === "vote"
              ? t.votes
              : t.actions}
        </span>
        <time>{item.date ? dateText(item.date, lang) : t.noDate}</time>
      </div>
      <h3>{item.title}</h3>
      <p>{item.summary}</p>
      {item.originalText && <blockquote>{item.originalText}</blockquote>}
      <div className="evidence-tags">
        <span>{t[item.stance]}</span>
        <span>{t[item.verification]}</span>
      </div>
      {item.context && (
        <p className="evidence-context">
          <strong>{t.context}:</strong> {item.context}
        </p>
      )}
      <a href={item.sourceUrl} target="_blank" rel="noreferrer">
        {item.sourceLabel}
        <ExternalLink size={13} />
      </a>
    </article>
  );
}
