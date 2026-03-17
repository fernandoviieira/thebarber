import React, { useMemo, useState } from "react";
import {
  Calendar,
  TrendingUp,
  Users,
  ShieldCheck,
  Zap,
  ChevronRight,
  PlayCircle,
  Star,
  Scissors,
  CheckCircle2,
  BarChart3,
  MessageCircle,
  CreditCard,
  Timer,
  BadgeCheck,
  X,
} from "lucide-react";

interface LandingPageProps {
  onLogin: () => void;
  demoUrl?: string; // ex.: https://www.youtube.com/embed/SEU_VIDEO_ID
  supportWhatsAppUrl?: string; // ex.: https://wa.me/55DDDNUMERO
}

type Feature = {
  icon: React.ReactNode;
  title: string;
  description: string;
  bullets: string[];
};

type Testimonial = {
  name: string;
  shop: string;
  text: string;
};

const LandingPage: React.FC<LandingPageProps> = ({
  onLogin,
  demoUrl,
  supportWhatsAppUrl,
}) => {
  const [isDemoOpen, setIsDemoOpen] = useState(false);

  const features: Feature[] = useMemo(
    () => [
      {
        icon: <Calendar size={28} />,
        title: "Agenda que reduz faltas",
        description:
          "Confirmações e lembretes para blindar seus horários — na prática, até 47% menos faltas.",
        bullets: [
          "Agendamento online 24h",
          "Confirmação e lembretes automáticos",
          "Bloqueios, encaixes e controle de agenda",
        ],
      },
      {
        icon: <TrendingUp size={28} />,
        title: "Financeiro sem achismo",
        description:
          "Veja lucro, comissões e faturamento em tempo real. Fechamento do dia rápido e sem discussão.",
        bullets: [
          "Comissões por barbeiro",
          "Relatórios por período, serviço e profissional",
          "Fluxo de caixa simples e direto",
        ],
      },
      {
        icon: <Users size={28} />,
        title: "Recorrência (Clube VIP)",
        description:
          "Crie planos de assinatura para aumentar ticket e trazer previsibilidade de caixa.",
        bullets: [
          "Planos mensais (VIP)",
          "Benefícios e regras por plano",
          "Visão clara de clientes recorrentes",
        ],
      },
    ],
    []
  );

  const testimonials: Testimonial[] = useMemo(
    () => [
      {
        name: "Ricardo “Bigode” Santos",
        shop: "Barbearia Old School",
        text:
          "Eu vivia refém do WhatsApp. Hoje a agenda fica organizada, diminuiu falta e eu voltei a focar no atendimento.",
      },
      {
        name: "Felipe Garrido",
        shop: "Elite Cut Unidade 01",
        text:
          "A parte de comissões e relatórios ajudou demais. Dá pra enxergar o resultado do dia sem planilha.",
      },
      {
        name: "Amanda Rocha",
        shop: "Studio Fade & Brow",
        text:
          "O agendamento online mudou a percepção de profissionalismo. O cliente entra e já sente que a barbearia é ‘de verdade’.",
      },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-amber-500/30 overflow-x-hidden">
      {/* FUNDO / LUZ */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(900px 500px at 50% 0%, rgba(245,158,11,0.18), transparent 60%), radial-gradient(700px 420px at 20% 30%, rgba(244,63,94,0.10), transparent 55%), radial-gradient(700px 420px at 80% 35%, rgba(59,130,246,0.08), transparent 55%)",
        }}
      />

      {/* NAV */}
      <header className="sticky top-0 z-[100] backdrop-blur-md border-b border-white/5 bg-black/60">
        <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="#top" className="flex items-center gap-2 group">
            <span className="bg-amber-500 p-1.5 rounded-lg transition-transform group-hover:rotate-6">
              <Scissors size={20} className="text-black" />
            </span>
            <span className="text-xl font-black tracking-tighter uppercase italic">
              BarbersPro
            </span>
          </a>

          <div className="hidden md:flex items-center gap-6 text-xs font-black uppercase tracking-[0.25em] text-zinc-400">
            <a className="hover:text-white transition-colors" href="/">
              Recursos
            </a>
            <a className="hover:text-white transition-colors" href="/">
              Resultados
            </a>
            <a className="hover:text-white transition-colors" href="/">
              Preço
            </a>
            <a className="hover:text-white transition-colors" href="/">
              FAQ
            </a>
          </div>

          <div className="flex items-center gap-3">
            {supportWhatsAppUrl ? (
              <a
                href={supportWhatsAppUrl}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] border border-white/10 px-4 py-2.5 rounded-full hover:bg-white/5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                aria-label="Falar no WhatsApp"
              >
                <MessageCircle size={14} />
                WhatsApp
              </a>
            ) : null}

            <button
              onClick={onLogin}
              className="text-[10px] font-black uppercase tracking-[0.2em] border border-amber-500/50 px-6 py-2.5 rounded-full hover:bg-amber-500 hover:text-black transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70"
              aria-label="Acessar o sistema"
            >
              Acessar Sistema
            </button>
          </div>
        </nav>
      </header>

      {/* HERO */}
      <main id="top">
        <section className="relative pt-16 md:pt-24 pb-14 md:pb-20 px-6">
          <div className="max-w-6xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-[0.3em] mb-8 animate-pulse">
              <Zap size={12} className="text-amber-400" />
              Gestão de Elite para Barbearias
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tighter leading-[0.95] uppercase italic mb-6">
              Saia do WhatsApp.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-600">
                Entre no modo profissional.
              </span>
            </h1>

            <p className="text-zinc-300/90 text-base md:text-xl max-w-3xl mx-auto mb-10 font-medium leading-relaxed">
              O BarbersPro organiza sua agenda, reduz faltas em{" "}
              <span className="text-amber-400 font-black">47%</span>, controla
              comissões e mostra seu lucro do dia — por{" "}
              <span className="text-amber-400 font-black">R$ 89/mês</span> no
              plano inicial.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={onLogin}
                className="bg-amber-500 text-black px-10 py-5 rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-amber-400 transition-all hover:scale-[1.02] shadow-[0_20px_60px_rgba(245,158,11,0.18)] flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                aria-label="Começar agora"
              >
                Começar agora <ChevronRight size={18} strokeWidth={3} />
              </button>

              <button
                onClick={() => {
                  if (demoUrl) setIsDemoOpen(true);
                  else onLogin();
                }}
                className="bg-zinc-900 border border-zinc-800 text-white px-10 py-5 rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                aria-label="Ver demonstração"
              >
                <PlayCircle size={18} />
                Ver demonstração{" "}
                <span className="text-amber-400">• R$ 89/mês</span>
              </button>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-[10px] font-black uppercase tracking-[0.35em] text-zinc-500">
              <span className="inline-flex items-center gap-2">
                <Users size={14} className="text-amber-500" />
                1.200+ clientes ativos
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 size={14} className="text-amber-500" />
                47% menos faltas
              </span>
              <span className="inline-flex items-center gap-2">
                <CreditCard size={14} className="text-amber-500" />
                Plano inicial: R$ 89/mês
              </span>
            </div>

            <div className="mt-6 text-xs text-zinc-400">
              Você corta. O sistema organiza. Você cresce com controle.
            </div>
          </div>
        </section>

        {/* PROVAS / RESULTADOS */}
        <section id="provas" className="px-6 pb-10">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 rounded-[2.5rem] border border-white/5 bg-zinc-950/60 p-8 md:p-10 relative overflow-hidden">
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />

              <h2 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter mb-3">
                Menos faltas. <span className="text-amber-500">Mais caixa.</span>
              </h2>

              <p className="text-zinc-400 leading-relaxed mb-6">
                O que mata o faturamento não é só “falta de cliente”. É agenda bagunçada,
                buraco por no-show e falta de visão do dinheiro. Aqui você resolve isso de ponta a ponta.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <StatCard
                  icon={<CheckCircle2 size={18} />}
                  label="No-show"
                  value="47% menos faltas"
                />
                <StatCard
                  icon={<Users size={18} />}
                  label="Base ativa"
                  value="1.200+ clientes"
                />
                <StatCard
                  icon={<CreditCard size={18} />}
                  label="Plano inicial"
                  value="R$ 89/mês"
                />
                <StatCard
                  icon={<Timer size={18} />}
                  label="Operação"
                  value="Rotina mais leve"
                />
              </div>

              <button
                onClick={onLogin}
                className="mt-8 w-full bg-amber-500 text-black px-8 py-4 rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-amber-400 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                Quero profissionalizar agora
              </button>

              <p className="mt-3 text-[11px] text-zinc-500">
                Plano inicial por R$ 89/mês. (Ajuste benefícios do plano conforme sua oferta.)
              </p>
            </div>

            <div className="lg:col-span-7 grid md:grid-cols-2 gap-6">
              {testimonials.map((t) => (
                <TestimonialCard key={t.name} {...t} />
              ))}
            </div>
          </div>
        </section>

        {/* RECURSOS */}
        <section
          id="recursos"
          className="py-16 md:py-24 bg-zinc-950 border-y border-white/5 px-6"
        >
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter mb-4">
                Tudo para{" "}
                <span className="text-amber-500">lotar agenda e dominar caixa</span>
              </h2>
              <div className="h-1 w-20 bg-amber-500 mx-auto rounded-full" />
              <p className="mt-5 text-zinc-400 max-w-2xl mx-auto">
                Sistema feito para barbearia de verdade: rápido na operação, forte na gestão e claro no dinheiro.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {features.map((f) => (
                <FeatureCard key={f.title} {...f} />
              ))}
            </div>
          </div>
        </section>

        {/* COMO FUNCIONA */}
        <section className="py-16 md:py-24 px-6">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5">
              <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter">
                Começa hoje.
                <br />
                <span className="text-amber-500">Sem complicação.</span>
              </h2>

              <p className="mt-5 text-zinc-400 leading-relaxed">
                Em poucos passos você sai do improviso e entra no controle. A meta é simples:
                reduzir buracos na agenda e enxergar o dinheiro com clareza.
              </p>

              <div className="mt-8 rounded-[2rem] border border-white/5 bg-zinc-950/60 p-6">
                <div className="flex items-center gap-2 text-amber-500 font-black uppercase tracking-widest text-xs">
                  <ShieldCheck size={16} />
                  Controle & Segurança
                </div>
                <p className="mt-3 text-zinc-400 text-sm leading-relaxed">
                  Controle de acesso por perfil e visão de operação para dono/gerente/barbeiro — sem bagunça de permissões.
                </p>
              </div>

              <div className="mt-4 rounded-[2rem] border border-white/5 bg-zinc-950/60 p-6">
                <div className="flex items-center gap-2 text-amber-500 font-black uppercase tracking-widest text-xs">
                  <BadgeCheck size={16} />
                  Prova real
                </div>
                <p className="mt-3 text-zinc-400 text-sm leading-relaxed">
                  Barbearias usando o BarbersPro reportam <span className="text-amber-400 font-black">47% menos faltas</span> e já somam
                  <span className="text-amber-400 font-black"> 1.200+ clientes ativos</span>.
                </p>
              </div>
            </div>

            <div className="lg:col-span-7 grid gap-4">
              <StepCard
                step="01"
                title="Cadastre serviços e equipe"
                desc="Defina preços, horários, barbeiros e regras em minutos."
              />
              <StepCard
                step="02"
                title="Ative agendamento online 24h"
                desc="Cliente agenda sozinho — menos mensagens, mais tempo para atender."
              />
              <StepCard
                step="03"
                title="Reduza faltas com confirmações"
                desc="Lembretes e confirmação para proteger seus horários (47% menos faltas)."
              />
              <StepCard
                step="04"
                title="Controle comissões e lucro"
                desc="Fechamento do dia e relatórios para você enxergar o caixa com clareza."
              />
            </div>
          </div>
        </section>

        {/* PREÇO */}
        <section id="preco" className="py-16 md:py-24 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter">
                Comece no <span className="text-amber-500">Plano Inicial</span>
              </h2>
              <p className="mt-4 text-zinc-400">
                Valor direto, sem enrolação — feito para se pagar com poucos agendamentos.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="rounded-[2.5rem] border border-white/5 bg-zinc-950/60 p-8 relative overflow-hidden">
                <div className="absolute -top-16 -right-16 w-56 h-56 bg-amber-500/10 rounded-full blur-3xl" />

                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-400">
                  Plano inicial
                </div>

                <div className="mt-3 flex items-end gap-2">
                  <div className="text-5xl font-black tracking-tighter">R$ 89</div>
                  <div className="text-zinc-400 font-black uppercase text-sm mb-1">
                    /mês
                  </div>
                </div>

                <ul className="mt-6 space-y-3 text-zinc-200">
                  <li className="flex gap-2">
                    <CheckCircle2 size={18} className="text-amber-500 mt-0.5" />
                    <span>Agendamento online 24h</span>
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle2 size={18} className="text-amber-500 mt-0.5" />
                    <span>Rotina com 47% menos faltas</span>
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle2 size={18} className="text-amber-500 mt-0.5" />
                    <span>Comissões + relatórios + visão do lucro</span>
                  </li>
                </ul>

                <button
                  onClick={onLogin}
                  className="mt-8 w-full bg-amber-500 text-black px-8 py-4 rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-amber-400 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                >
                  Começar agora
                </button>

                <p className="mt-3 text-[11px] text-zinc-500">
                  Dica: se você tiver mais planos, duplique esse card e compare lado a lado.
                </p>
              </div>

              <div className="rounded-[2.5rem] border border-white/5 bg-zinc-900/40 p-8">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">
                  Por que converte
                </div>

                <h3 className="mt-3 text-2xl font-black uppercase italic tracking-tight">
                  Menos buracos, mais retorno
                </h3>

                <p className="mt-3 text-zinc-400 leading-relaxed">
                  O BarbersPro tira a agenda do improviso e coloca você no controle.
                  Resultado direto: agenda mais cheia, menos perda por falta e mais previsibilidade.
                </p>

                <div className="mt-6 grid gap-3">
                  <MiniProof
                    icon={<CheckCircle2 size={18} />}
                    title="47% menos faltas"
                    desc="Protege seus horários mais valiosos e reduz buracos no dia."
                  />
                  <MiniProof
                    icon={<Users size={18} />}
                    title="1.200+ clientes ativos"
                    desc="Tração real com barbearias rodando no dia a dia."
                  />
                  <MiniProof
                    icon={<BarChart3 size={18} />}
                    title="Dinheiro claro"
                    desc="Relatórios e visão do lucro para decisões rápidas."
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="py-16 md:py-24 px-6">
          <div className="max-w-5xl mx-auto bg-gradient-to-br from-amber-500 to-amber-600 rounded-[3rem] p-10 md:p-14 text-center relative overflow-hidden shadow-[0_40px_120px_rgba(245,158,11,0.22)]">
            <div className="absolute top-0 right-0 p-8 opacity-20 rotate-12">
              <Scissors size={120} className="text-black" />
            </div>

            <h2 className="text-3xl md:text-6xl font-black text-black uppercase italic tracking-tighter mb-4 md:mb-6 leading-none">
              Chega de <br className="hidden sm:block" />
              amadorismo.
            </h2>

            <p className="text-black/85 font-bold text-base md:text-lg mb-8 md:mb-10 max-w-2xl mx-auto">
              Agenda profissional + menos faltas + dinheiro claro — por{" "}
              <span className="font-black">R$ 89/mês</span> no plano inicial.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={onLogin}
                className="bg-black text-white px-10 py-5 rounded-2xl font-black uppercase text-sm tracking-widest hover:scale-[1.02] transition-all shadow-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-black/50"
              >
                Começar agora
              </button>

              <button
                onClick={() => {
                  if (demoUrl) setIsDemoOpen(true);
                  else onLogin();
                }}
                className="bg-white/10 border border-black/20 text-black px-10 py-5 rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-white/20 transition-all"
              >
                Ver demo
              </button>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-4 text-[11px] font-black uppercase tracking-[0.3em] text-black/70">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 size={14} />
                47% menos faltas
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 size={14} />
                1.200+ ativos
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 size={14} />
                R$ 89/mês
              </span>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="pb-20 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter">
                Perguntas <span className="text-amber-500">frequentes</span>
              </h2>
              <p className="mt-4 text-zinc-400">
                Respostas diretas para acelerar sua decisão.
              </p>
            </div>

            <div className="grid gap-3">
              <FAQItem
                q="Qual é o valor para começar?"
                a="O plano inicial custa R$ 89/mês. Você já começa com o essencial para organizar agenda, reduzir faltas e controlar a operação."
              />
              <FAQItem
                q="Isso substitui o WhatsApp?"
                a="Você pode continuar no WhatsApp para relacionamento. O que sai é a bagunça de “agenda por mensagem”: o cliente agenda online e você ganha tempo."
              />
              <FAQItem
                q="Consigo controlar comissões por barbeiro?"
                a="Sim. Você define regras e acompanha valores por período, reduzindo erro e ruído no fechamento."
              />
              <FAQItem
                q="Funciona com mais de um barbeiro?"
                a="Sim. A ideia é exatamente organizar operação com equipe, horários e visão de resultados."
              />
              <FAQItem
                q="O que significa 47% menos faltas?"
                a="É o resultado observado com confirmações e lembretes, reduzindo no-show e protegendo horários nobres."
              />
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="py-12 px-6 border-t border-white/5 text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="bg-zinc-800 p-1.5 rounded-lg">
            <Scissors size={16} className="text-amber-500" />
          </div>
          <span className="text-sm font-black tracking-tighter uppercase italic text-zinc-500">
            BarbersPro
          </span>
        </div>
        <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.4em]">
          © 2026 BARBERSPRO TECH — SOFTWARE DE GESTÃO PROFISSIONAL
        </p>
      </footer>

      {/* Sticky CTA (mobile) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[120] border-t border-white/10 bg-black/75 backdrop-blur-md px-4 py-3">
        <button
          onClick={onLogin}
          className="w-full bg-amber-500 text-black py-4 rounded-2xl font-black uppercase text-sm tracking-widest flex items-center justify-center gap-2"
          aria-label="Começar agora (CTA fixo)"
        >
          Começar agora <ChevronRight size={18} strokeWidth={3} />
        </button>
      </div>

      {/* Demo Modal (opcional) */}
      {demoUrl && isDemoOpen ? (
        <div
          className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm px-4 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Demonstração do sistema"
          onClick={() => setIsDemoOpen(false)}
        >
          <div
            className="w-full max-w-4xl rounded-3xl overflow-hidden border border-white/10 bg-zinc-950 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400">
                Demonstração
              </div>
              <button
                className="inline-flex items-center gap-2 text-zinc-400 hover:text-white text-xs font-black uppercase tracking-[0.2em] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded-lg px-2 py-1"
                onClick={() => setIsDemoOpen(false)}
                aria-label="Fechar demonstração"
              >
                <X size={16} />
                Fechar
              </button>
            </div>

            <div className="aspect-video bg-black">
              <iframe
                className="w-full h-full"
                src={demoUrl}
                title="Demonstração BarbersPro"
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-black/30 p-4">
      <div className="flex items-center gap-2 text-amber-500">
        {icon}
        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">
          {label}
        </span>
      </div>
      <div className="mt-2 text-sm font-black uppercase italic tracking-tight">
        {value}
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description, bullets }: Feature) {
  return (
    <div className="group p-8 md:p-10 rounded-[2.5rem] bg-zinc-900/50 border border-white/5 hover:border-amber-500/30 transition-all duration-500 relative overflow-hidden">
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/5 rounded-full blur-3xl group-hover:bg-amber-500/10 transition-all" />
      <div className="text-amber-500 mb-6 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500">
        {icon}
      </div>

      <h3 className="text-xl font-black uppercase italic mb-3">{title}</h3>
      <p className="text-zinc-400 text-sm leading-relaxed font-medium mb-5">
        {description}
      </p>

      <ul className="space-y-2 text-sm text-zinc-300">
        {bullets.map((b) => (
          <li key={b} className="flex gap-2 items-start">
            <CheckCircle2 size={16} className="text-amber-500 mt-0.5" />
            <span className="leading-relaxed">{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TestimonialCard({ name, shop, text }: Testimonial) {
  return (
    <div className="p-8 rounded-[2rem] bg-zinc-900 border border-zinc-800 relative shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} size={14} className="text-amber-500 fill-amber-500" />
          ))}
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 inline-flex items-center gap-2">
          <Scissors size={14} className="text-amber-500" />
          Cliente
        </span>
      </div>

      <p className="text-zinc-200 italic mb-6 font-medium leading-relaxed">
        “{text}”
      </p>

      <div>
        <h4 className="font-black uppercase text-sm italic">{name}</h4>
        <p className="text-amber-500 text-[10px] font-black uppercase tracking-widest mt-1">
          {shop}
        </p>
      </div>
    </div>
  );
}

function StepCard({
  step,
  title,
  desc,
}: {
  step: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-[2rem] border border-white/5 bg-zinc-950/60 p-6 md:p-7 flex gap-4">
      <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 font-black">
        {step}
      </div>
      <div>
        <div className="text-lg font-black uppercase italic">{title}</div>
        <div className="mt-1 text-zinc-400 leading-relaxed">{desc}</div>
      </div>
    </div>
  );
}

function MiniProof({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-black/30 p-5">
      <div className="flex items-center gap-2 text-amber-500">
        {icon}
        <div className="text-sm font-black uppercase italic tracking-tight text-white">
          {title}
        </div>
      </div>
      <p className="mt-2 text-zinc-400 leading-relaxed">{desc}</p>
    </div>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="group rounded-2xl border border-white/5 bg-zinc-950/60 p-5 md:p-6">
      <summary className="cursor-pointer list-none flex items-center justify-between gap-4">
        <span className="font-black uppercase italic tracking-tight">{q}</span>
        <span className="text-amber-500 font-black group-open:rotate-90 transition-transform">
          <ChevronRight size={18} strokeWidth={3} />
        </span>
      </summary>
      <div className="mt-3 text-zinc-400 leading-relaxed">{a}</div>
    </details>
  );
}

export default LandingPage;
