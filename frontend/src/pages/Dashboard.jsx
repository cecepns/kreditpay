import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import useFetch from "@/hooks/useFetch";
import useAuth from "@/hooks/useAuth";
import BalanceCard from "@/components/dashboard/BalanceCard";
import ActionModal from "@/components/dashboard/ActionModal";
import TopUpModal from "@/components/dashboard/TopUpModal";
import LevelLockModal from "@/components/dashboard/LevelLockModal";
import Modal from "@/components/ui/Modal";
import { ErrorState } from "@/components/ui/StateViews";
import { actionConfigs } from "@/utils/actionConfigs";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { PROMOS, SERVICES } from "@/constants/services";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, loading, error, reload } = useFetch(API_ENDPOINTS.DASHBOARD.SUMMARY);
  const { data: levelConfigsData } = useFetch(API_ENDPOINTS.LEVELS.LIST);
  const { data: promosData, loading: promosLoading } = useFetch(API_ENDPOINTS.PROMOS.LIST);
  const [action, setAction] = useState(null);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpInitialAmount, setTopUpInitialAmount] = useState("");
  const [levelLock, setLevelLock] = useState(null); // null | "level1" | "level2_transfer" | "level2_ppob" | "level3_tertunda" | "level3_detail" | "pindah_saldo"
  const [selectedPromo, setSelectedPromo] = useState(null);
  const [showAllPromos, setShowAllPromos] = useState(false);

  const promos = (promosData?.data && promosData.data.length > 0) ? promosData.data : PROMOS;

  const userLevel = Number(data?.data?.level ?? user?.level ?? 1);

  const handleTransfer = () => {
    if (userLevel === 1) {
      setLevelLock("level1");
    } else if (userLevel === 2) {
      setLevelLock("level2_transfer");
    } else if (userLevel === 3) {
      setLevelLock("level3_tertunda");
    } else {
      // Level 4, 5, 6, 7 Pindah Saldo
      setLevelLock("pindah_saldo");
    }
  };

  const handleServiceClick = (service) => {
    if (userLevel === 1) {
      setLevelLock("level1");
    } else if (userLevel === 2) {
      setLevelLock("level2_ppob");
    } else {
      setAction(actionConfigs.pay(service));
    }
  };

  const handleLevelAction = (actionType) => {
    if (actionType === "integrasi") {
      toast.success("Permintaan integrasi Autodebet telah dikirim ke Admin!");
    } else if (actionType === "cairkan") {
      navigate("/app/paylater");
    }
  };

  if (error) return <div className="rounded-3xl bg-white shadow-xl"><ErrorState message={error} onRetry={reload} /></div>;

  return (
    <div className="space-y-6">
      <BalanceCard
        summary={data?.data}
        loading={loading}
        userLevel={userLevel}
        onTopUp={() => setTopUpOpen(true)}
        onTransfer={handleTransfer}
        onApplyPaylater={() => {
          navigate("/app/paylater");
        }}
      />

      <section className="grid grid-cols-4 gap-y-5 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100" aria-label="Layanan">
        {SERVICES.map((s) => (
          <button
            key={s.key}
            onClick={() => handleServiceClick(s)}
            className="flex flex-col items-center gap-2 text-sm font-bold text-slate-700 transition hover:opacity-80 active:scale-95"
          >
            <span className={`grid h-14 w-14 place-items-center rounded-full ${s.tone}`}><s.icon className="h-6 w-6" /></span>
            {s.label}
          </button>
        ))}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="text-xl font-extrabold text-slate-800">Info &amp; Promo</h2>
          <button
            type="button"
            onClick={() => setShowAllPromos(true)}
            className="text-sm font-extrabold text-accent-600 hover:text-accent-700 transition"
          >
            Lihat Semua
          </button>
        </div>
        <div className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4">
          {promosLoading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="h-36 w-72 shrink-0 animate-pulse rounded-3xl bg-slate-200" />
            ))
          ) : (
            promos.map((p) => (
              <article
                key={p.id}
                onClick={() => {
                  if (p.link_url) {
                    if (p.link_url.startsWith("http")) window.open(p.link_url, "_blank");
                    else navigate(p.link_url);
                  } else {
                    setSelectedPromo(p);
                  }
                }}
                className={`h-36 w-72 shrink-0 snap-start cursor-pointer rounded-3xl bg-gradient-to-br p-5 text-white shadow-sm transition hover:shadow-md hover:scale-[1.01] active:scale-95 ${p.style}`}
              >
                <span className="rounded-lg bg-white/25 px-3 py-1 text-xs font-extrabold">{p.tag}</span>
                <h3 className="mt-3 text-xl font-extrabold leading-snug line-clamp-2">{p.title}</h3>
                {p.description && (
                  <p className="mt-1 text-xs font-semibold text-white/80 line-clamp-1">{p.description}</p>
                )}
              </article>
            ))
          )}
        </div>
      </section>

      {/* Modal Detail Promo */}
      <Modal
        open={!!selectedPromo}
        onClose={() => setSelectedPromo(null)}
        title={selectedPromo?.tag ? `Promo ${selectedPromo.tag}` : "Detail Promo"}
      >
        {selectedPromo && (
          <div className="space-y-4">
            <div className={`rounded-3xl bg-gradient-to-br p-6 text-white shadow-md ${selectedPromo.style}`}>
              <span className="rounded-lg bg-white/25 px-3 py-1 text-xs font-extrabold">
                {selectedPromo.tag}
              </span>
              <h3 className="mt-3 text-2xl font-black leading-snug">{selectedPromo.title}</h3>
            </div>
            {selectedPromo.description && (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-1">
                  Syarat &amp; Ketentuan Promo
                </h4>
                <p className="text-sm font-semibold text-slate-700 leading-relaxed whitespace-pre-line">
                  {selectedPromo.description}
                </p>
              </div>
            )}
            {selectedPromo.link_url && (
              <button
                type="button"
                onClick={() => {
                  const url = selectedPromo.link_url;
                  setSelectedPromo(null);
                  if (url.startsWith("http")) window.open(url, "_blank");
                  else navigate(url);
                }}
                className="w-full rounded-2xl bg-primary-700 py-3.5 text-center text-sm font-extrabold text-white shadow-md transition hover:bg-primary-800"
              >
                Gunakan Promo Sekarang
              </button>
            )}
          </div>
        )}
      </Modal>

      {/* Modal Lihat Semua Promo */}
      <Modal
        open={showAllPromos}
        onClose={() => setShowAllPromos(false)}
        title="Semua Info & Promo"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {promos.map((p) => (
            <div
              key={p.id}
              onClick={() => {
                setShowAllPromos(false);
                setSelectedPromo(p);
              }}
              className={`cursor-pointer rounded-3xl bg-gradient-to-br p-5 text-white shadow-sm transition hover:shadow-md hover:scale-[1.01] active:scale-95 ${p.style}`}
            >
              <span className="rounded-lg bg-white/25 px-3 py-1 text-xs font-extrabold">{p.tag}</span>
              <h3 className="mt-2 text-lg font-extrabold leading-snug">{p.title}</h3>
              {p.description && (
                <p className="mt-1 text-xs font-semibold text-white/80 line-clamp-2">{p.description}</p>
              )}
            </div>
          ))}
        </div>
      </Modal>

      {action && <ActionModal config={action} onClose={() => setAction(null)} onDone={reload} />}
      <TopUpModal
        open={topUpOpen}
        initialAmount={topUpInitialAmount}
        onClose={() => {
          setTopUpOpen(false);
          setTopUpInitialAmount("");
        }}
        onDone={reload}
      />
      <LevelLockModal
        state={levelLock}
        activeLevel={userLevel}
        user={user}
        levelConfigs={levelConfigsData?.data}
        onClose={() => setLevelLock(null)}
        onTopUp={(fee) => {
          setTopUpInitialAmount(fee ? String(fee) : "");
          setTopUpOpen(true);
        }}
        onAction={handleLevelAction}
      />
    </div>
  );
}
