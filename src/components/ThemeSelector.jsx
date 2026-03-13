import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { HiComputerDesktop, HiMoon, HiSun, HiSwatch, HiXMark } from "react-icons/hi2";
import { useTheme } from "../hooks/useTheme";

const modeOptions = [
  { value: "light", label: "Light", icon: HiSun },
  { value: "dark", label: "Dark", icon: HiMoon },
  { value: "system", label: "System", icon: HiComputerDesktop }
];

const ThemeSelector = () => {
  const { theme, setTheme, colorScheme, setColorScheme, colorSchemes } = useTheme();
  const [open, setOpen] = useState(false);
  const activeBrand = colorSchemes[colorScheme]?.brand || "#875cf5";

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <HiSwatch size={16} />
        Theme
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-[200] bg-black/30 backdrop-blur-[1px]" onClick={() => setOpen(false)}>
          <div
            className="absolute inset-y-0 right-0 h-full w-full max-w-[420px] overflow-y-auto border-l border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-200 p-5 dark:border-slate-800">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Theme Settings</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Customize and preview instantly</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <HiXMark size={24} />
              </button>
            </div>

            <div className="space-y-8 p-5">
              <section>
                <h3 className="mb-4 text-2xl font-medium text-slate-900 dark:text-slate-100">Theme Mode</h3>
                <div className="grid grid-cols-3 gap-3">
                  {modeOptions.map((option) => {
                    const Icon = option.icon;
                    const active = theme === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setTheme(option.value)}
                        className={`rounded-xl border p-4 text-center transition ${
                          active
                            ? "ring-2"
                            : "border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"
                        }`}
                        style={active ? { borderColor: activeBrand, boxShadow: `0 0 0 2px ${activeBrand}33` } : undefined}
                      >
                        <Icon
                          size={28}
                          className={`mx-auto mb-2 ${active ? "" : "text-slate-500 dark:text-slate-400"}`}
                          style={active ? { color: activeBrand } : undefined}
                        />
                        <span
                          className={`text-base font-medium ${
                            active ? "" : "text-slate-700 dark:text-slate-200"
                          }`}
                          style={active ? { color: activeBrand } : undefined}
                        >
                          {option.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section>
                <h3 className="mb-4 text-2xl font-medium text-slate-900 dark:text-slate-100">Color Scheme</h3>
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(colorSchemes).map(([key, scheme]) => {
                    const active = colorScheme === key;

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setColorScheme(key)}
                        className={`rounded-xl border p-2 text-center transition ${
                          active
                            ? "ring-2"
                            : "border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"
                        }`}
                        style={active ? { borderColor: activeBrand, boxShadow: `0 0 0 2px ${activeBrand}33` } : undefined}
                      >
                        <span
                          className="mb-2 block h-12 rounded-lg"
                          style={{ backgroundColor: scheme.brand }}
                        />
                        <span
                          className={`text-base font-medium ${
                            active ? "" : "text-slate-700 dark:text-slate-200"
                          }`}
                          style={active ? { color: activeBrand } : undefined}
                        >
                          {scheme.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default ThemeSelector;
