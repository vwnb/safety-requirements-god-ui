import { useEffect, useState } from "react";
import Modal from "./Modal";
import { SemanticColor } from "../lib/SemanticColor";

export type LLMProviderName = "google" | "opper" | "reflection" | "openapi" | "openrouter";

export interface ProviderOption {
  key: LLMProviderName;
  label: string;
  defaultModel: string;
  modelOptions: string[];
}

/** Provider + model options surfaced to the UI (mirrors the backend's
 * `LLM_PROVIDER_OPTIONS` so the UI contract stays in sync with the API). */
export const LLM_PROVIDER_OPTIONS: ProviderOption[] = [
  {
    key: "google",
    label: "Google Gemini",
    defaultModel: "gemini-3.5-flash",
    modelOptions: ["gemini-3.5-flash"],
  },
  {
    key: "opper",
    label: "Opper.ai",
    defaultModel: "openai/gpt-4o-mini",
    modelOptions: ["openai/gpt-4o-mini"],
  },
  {
    key: "reflection",
    label: "Reflection / Beam",
    defaultModel: "Beam-1.0-501B-A23B",
    modelOptions: ["Beam-1.0-501B-A23B"],
  },
  {
    key: "openapi",
    label: "OpenAPI",
    defaultModel: "gpt-4o-mini",
    modelOptions: ["gpt-4o-mini"],
  },
  {
    key: "openrouter",
    label: "OpenRouter",
    defaultModel: "upstage/solar-mini4:free",
    modelOptions: [
      "upstage/solar-mini4:free",
      "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
      "recursive/flint-v1.0:free",
      "nvidia/nemotron-3-ultra",
    ],
  },
];

type UserSettingResponse = {
  id: string;
  userId: string;
  provider: LLMProviderName | null;
  model: string | null;
  updatedAt: string;
};

const buttonStyle: React.CSSProperties = {
  all: "unset" as any,
  color: "black",
  background: "white",
  borderWidth: "2px",
  borderStyle: "solid",
  borderLeftWidth: "6px",
  borderRadius: 4,
  padding: "6px 12px",
  margin: "4px 0",
  cursor: "pointer",
  fontFamily: "monospace",
  fontWeight: 600,
  boxSizing: "border-box" as const,
};

const labelStyle: React.CSSProperties = {
  width: "150px",
  marginRight: 10,
  color: "black",
  font: "IBM Plex Mono, monospace",
  fontSize: 13,
};

const selectStyle: React.CSSProperties = {
  background: "white",
  border: "2px solid black",
  padding: "6px",
  fontFamily: "monospace",
  width: "100%",
  boxSizing: "border-box" as const,
  cursor: "pointer",
};

export function UserSettingsModal({
  apiFetch,
  onClose,
}: {
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
  onClose: () => void;
}) {
  const API = import.meta.env.VITE_API_URL || "";
  const [provider, setProvider] = useState<LLMProviderName | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch(`${API}/user-settings/me`);
        if (res.ok) {
          const data = (await res.json()) as UserSettingResponse;
          setProvider(data.provider ?? null);
          setModel(data.model ?? null);
        } else if (res.status === 403) {
          setProvider(null);
          setModel(null);
        } else {
          setError("Failed to load settings");
        }
      } catch {
        setError("Network error loading settings");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [API, apiFetch]);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await apiFetch(`${API}/user-settings/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, model }),
      });
      if (res.ok) {
        onClose();
      } else if (res.status === 400) {
        const data = await res.json();
        setSaveError(data.error || "Invalid input");
      } else {
        setSaveError("Failed to save settings");
      }
    } catch {
      setSaveError("Network error saving settings");
    } finally {
      setSaving(false);
    }
  };

  const currentModel =
    provider === null
      ? null
      : model ?? LLM_PROVIDER_OPTIONS.find((o) => o.key === provider)?.defaultModel ?? null;

  return (
    <Modal title="Settings" onClose={onClose}>
      {loading && <p>Loading settings...</p>}

      {error && (
        <div className="error-box">
          <p className="error-text">{error}</p>
        </div>
      )}

      {!loading && !error && provider === null && (
        <div>
          <div
            style={{
              background: SemanticColor.ARGUMENT,
              border: "2px solid black",
              padding: "8px 12px",
              borderRadius: 4,
              fontFamily: "monospace",
              fontSize: 13,
              color: "#fff",
              marginBottom: 8,
            }}
          >
            No provider override
          </div>
          <p style={{ margin: 0, marginBottom: 8 }}>
            Your LLM provider and model will use the system default. Use the
            selectors below to override for your account.
          </p>
        </div>
      )}

      {!loading && !error && provider !== null && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={labelStyle}>LLM Provider</label>
            <select
              value={provider ?? ""}
              onChange={(e) =>
                setProvider(e.target.value as LLMProviderName || null)
              }
              style={selectStyle}
            >
              <option value="">System default</option>
              {LLM_PROVIDER_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={labelStyle}>Main Model</label>
            <select
              value={model ?? ""}
              onChange={(e) => setModel(e.target.value || null)}
              disabled={!provider}
              style={selectStyle}
            >
              {provider === null ? (
                <option value="">System default</option>
              ) : (
                <>
                  <option value="">Default ({currentModel})</option>
                  {LLM_PROVIDER_OPTIONS
                    .find((o) => o.key === provider)
                    ?.modelOptions.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                </>
              )}
            </select>
          </div>

          {saveError && (
            <div className="error-box">
              <p className="error-text" style={{ color: SemanticColor.DANGER }}>
                {saveError}
              </p>
            </div>
          )}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={onClose} style={buttonStyle}>
              Cancel
            </button>
            <button
              onClick={handleSave}
              style={{
                ...buttonStyle,
                background: provider !== null ? "rgb(255, 90, 0)" : "rgb(200, 200, 200)",
              }}
              disabled={saving || !provider}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
