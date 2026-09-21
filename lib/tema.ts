export type Tema = "claro" | "escuro" | "automatico";

export const CHAVE_DO_TEMA = "supportdesk:tema";
const EVENTO = "supportdesk:tema-mudou";

/**
 * Roda no <head> antes da primeira pintura: aplica a classe do tema salvo para a
 * página não abrir clara e "piscar" para escura. É texto fixo do código — não
 * recebe nada do usuário. "automatico" não adiciona classe: vale o sistema.
 */
export const SCRIPT_DO_TEMA = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  CHAVE_DO_TEMA,
)});var r=document.documentElement;if(t==="escuro")r.classList.add("dark");else if(t==="claro")r.classList.add("light");}catch(e){}})();`;

export function lerTema(): Tema {
  try {
    const salvo = localStorage.getItem(CHAVE_DO_TEMA);
    return salvo === "claro" || salvo === "escuro" ? salvo : "automatico";
  } catch {
    return "automatico";
  }
}

export function aplicarTema(tema: Tema) {
  const raiz = document.documentElement;
  raiz.classList.remove("dark", "light");
  if (tema === "escuro") raiz.classList.add("dark");
  if (tema === "claro") raiz.classList.add("light");

  try {
    if (tema === "automatico") localStorage.removeItem(CHAVE_DO_TEMA);
    else localStorage.setItem(CHAVE_DO_TEMA, tema);
  } catch {
    // Modo privado ou armazenamento bloqueado: o tema vale só nesta sessão.
  }

  window.dispatchEvent(new Event(EVENTO));
}

export function assinarTema(aoMudar: () => void) {
  window.addEventListener(EVENTO, aoMudar);
  window.addEventListener("storage", aoMudar);
  return () => {
    window.removeEventListener(EVENTO, aoMudar);
    window.removeEventListener("storage", aoMudar);
  };
}
