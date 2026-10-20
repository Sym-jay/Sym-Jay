import { views } from "@/views";

// ?view=<name>&theme=light|dark renders one capture target; no view lists them all for previewing.
export default function App() {
  const params = new URLSearchParams(location.search);
  const name = params.get("view");
  document.documentElement.classList.toggle("dark", params.get("theme") === "dark");

  if (name && views[name]) {
    document.body.classList.add("capture");
    const view = views[name];
    return (
      <div id="capture" style={{ width: view.width }}>
        {view.render()}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-8">
      {Object.entries(views).map(([key, view]) => (
        <section key={key} className="flex flex-col gap-2">
          <a className="text-xs text-muted-foreground" href={`?view=${key}`}>
            {key}
          </a>
          <div style={{ width: view.width }}>{view.render()}</div>
        </section>
      ))}
    </div>
  );
}
