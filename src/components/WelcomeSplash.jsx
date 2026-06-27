import React, { useEffect, useState } from "react";
import { Compass } from "lucide-react";
import { burst } from "../money/confetti.js";

export default function WelcomeSplash({ name, onDone }) {
  const [leaving, setLeaving] = useState(false);
  const first = (name || "").trim().split(/\s+/)[0];
  const greet = first && first.toLowerCase() !== "guest" ? `Welcome, ${first}!` : "Welcome!";

  useEffect(() => {
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let cf;
    if (!reduce) cf = setTimeout(() => { try { burst({ count: 140, duration: 1600, originY: 0.42 }); } catch {} }, 520);
    const t1 = setTimeout(() => setLeaving(true), 2500);
    const t2 = setTimeout(onDone, 3050);
    return () => { clearTimeout(cf); clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className={"ws" + (leaving ? " leave" : "")}>
      <div className="ws-stage">
        <div className="ws-rings"><span /><span /><span /></div>
        <div className="ws-logo"><img src="/logo-mark.png" alt="" /></div>
      </div>
      <div className="ws-hi">{greet}</div>
      <div className="ws-sub">Let's make your taka count.</div>
    </div>
  );
}
