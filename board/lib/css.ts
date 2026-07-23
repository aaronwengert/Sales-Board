export const CSS = `
  :root{
    --page:#e9edf3;--card:#fff;--ink:#17233d;--ink2:#5c6a7a;--muted:#8b95a6;--line:#e5e9f0;--track:#e9edf2;
    --green:#1a9e4e;--green-soft:#e4f5ea;--green-ink:#127a3c;--amber:#e08a17;--amber-soft:#fbeed6;--amber-ink:#9a6410;
    --gold:#e0b000;--gold-soft:#fbf3d6;--gold-ink:#9a7a10;--b:#2a5bbf;
  }
  *{box-sizing:border-box}
  html,body{height:100%}
  body{margin:0;background:var(--page);color:var(--ink);
    font-family:system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    -webkit-font-smoothing:antialiased;padding:10px 22px}
  @media(max-width:1200px){body{padding:6px}}
  #fithost{width:100%;overflow:hidden}
  .wrap{width:1836px;margin:0 auto;transform-origin:top left}
  .tnum{font-variant-numeric:tabular-nums}
  .kpiband{display:flex;gap:8px;margin-bottom:8px;align-items:stretch}
  .kpiband .card{flex:0 0 auto}
  .cluster{flex:0 0 380px;display:flex;flex-direction:column;justify-content:space-between;
    border:1px solid var(--line);border-radius:14px;padding:11px 16px 12px;
    background:linear-gradient(180deg,#fff 55%,#f5f8fb);box-shadow:0 1px 2px rgba(20,30,50,.05)}
  .cl-top{display:flex;align-items:center;gap:13px}
  .logo{height:52px;width:auto;display:block;mix-blend-mode:multiply}
  .cl-brand{display:flex;flex-direction:column;align-items:flex-start;min-width:0}
  .cl-title{font-size:17px;font-weight:800;letter-spacing:-.3px;line-height:1.08;color:var(--ink)}
  .cl-month{margin-top:4px;font-size:16px;font-weight:800;letter-spacing:.2px;color:var(--green);
    line-height:1;display:inline-flex;align-items:center}
  .cl-month::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--green);
    margin-right:7px;box-shadow:0 0 0 3px color-mix(in srgb,var(--green) 18%,#fff)}
  .cl-days{display:flex;align-items:center;gap:11px;border-top:1px solid #e2e7ee;padding-top:9px;margin-top:10px}
  .cl-days .dl-n{font-size:34px;font-weight:800;letter-spacing:-1px;color:var(--green);line-height:1}
  .cl-days .dl-meta{min-width:0}
  .cl-days .dl-t{font-size:14px;font-weight:800;color:var(--ink);line-height:1.05}
  .cl-days .dl-sub{font-size:10.5px;font-weight:600;color:var(--muted);margin-top:3px}
  .kt-today{width:376px}.kt-pipe{width:336px}.kt-funded{width:340px}.kt-ondeck{width:372px}
  .combo .split{display:flex;margin-top:8px}
  .combo .half{flex:1}
  .combo .half+.half{border-left:1px solid #f0e2c9;padding-left:14px}
  .combo .half .k{font-size:10.5px;font-weight:800;color:var(--muted);letter-spacing:.4px;margin-bottom:4px}
  .combo .half .v{font-size:22px;font-weight:800;color:var(--accentink);line-height:1}
  .combo .half .v span{font-size:12px;color:var(--muted);font-weight:600}
  .card{--accent:#2a5bbf;--accentink:#2a5bbf;--accenttint:#f3f6fd;
    position:relative;overflow:hidden;border:1px solid var(--line);border-radius:14px;padding:12px 16px 11px;
    background:linear-gradient(180deg,#fff 60%,var(--accenttint));
    box-shadow:0 1px 2px rgba(20,30,50,.05);transition:box-shadow .16s ease,transform .16s ease}
  .card::before{content:"";position:absolute;top:0;left:0;right:0;height:3px;
    background:linear-gradient(90deg,var(--accent),color-mix(in srgb,var(--accent) 55%,#fff))}
  .card.k-blue  {--accent:#2a5bbf;--accentink:#2a5bbf;--accenttint:#f3f6fd}
  .card.k-green {--accent:#1a9e4e;--accentink:#127a3c;--accenttint:#eff9f3}
  .card.k-amber {--accent:#e08a17;--accentink:#9a6410;--accenttint:#fdf5e9}
  .card.k-violet{--accent:#6b4fbb;--accentink:#5b3ea8;--accenttint:#f4f0fc}
  .krow{display:flex;justify-content:space-between;align-items:center;min-height:18px}
  .klabel{font-size:11.5px;font-weight:800;letter-spacing:.5px;color:var(--muted);display:inline-flex;align-items:center}
  .klabel::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--accent);
    margin-right:7px;box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 18%,#fff)}
  .big{font-size:25px;font-weight:800;margin-top:7px;line-height:1;color:var(--accentink)}
  .big span{font-size:14px;font-weight:600;color:var(--muted)}
  .ksub{margin-top:6px;color:var(--ink2);font-size:12px}
  .pill{font-size:10px;font-weight:800;letter-spacing:.5px;padding:3px 8px;border-radius:20px}
  .pill.behind{background:var(--amber-soft);color:var(--amber-ink)}
  .pill.ahead{background:var(--green-soft);color:var(--green-ink)}
  .pill.subs{background:#efeafc;color:#5b3ea8}
  .pill.mtd{background:#eaf1fb;color:#2a5bbf}
  .psplit{display:flex;margin-top:8px}
  .psplit .h{flex:1}
  .psplit .h+.h{border-left:1px solid #eef1f6;padding-left:12px}
  .psplit .k{font-size:10px;font-weight:800;color:var(--muted);letter-spacing:.4px;margin-bottom:3px}
  .psplit .v{font-size:14px;font-weight:800;color:var(--accentink)}
  .psplit .v span{font-size:11px;color:var(--muted);font-weight:600}
  .pacebar{height:7px;border-radius:6px;background:var(--track);margin-top:9px;position:relative}
  .pacebar>i{display:block;height:100%;border-radius:6px;background:var(--green)}
  .pacebar .mk{position:absolute;top:-3px;bottom:-3px;width:2px;background:#2c3a52;opacity:.6}
  .pnote{margin-top:5px;color:var(--muted);font-size:11px}
  .goals{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:10px 0 8px;overflow:hidden;box-shadow:0 1px 2px rgba(20,30,50,.04)}
  table{width:100%;table-layout:fixed;border-collapse:separate;border-spacing:0}
  .sp{padding:0!important;border:0!important;background:transparent!important}
  th{font-size:9.5px;font-weight:700;letter-spacing:.3px;color:var(--muted);text-align:center;padding:5px 5px}
  th.l{text-align:left;padding-left:16px}
  th:last-child,td:last-child{padding-right:16px}
  .grouphdr{font-size:10px;font-weight:800;letter-spacing:.6px;padding:5px 6px;text-align:center;border-radius:8px 8px 0 0}
  td{padding:2px 5px;text-align:center;border-top:1px solid #eef1f5;vertical-align:middle}
  td.l{text-align:left;white-space:nowrap;padding-left:16px}
  .grouphdr.gh0{background:#6b4fbb;color:#fff}
  .grouphdr.gh1{background:#2a5bbf;color:#fff}
  .grouphdr.gh2{background:#1a9e4e;color:#fff}
  .grouphdr.gh3{background:#e08a17;color:#fff}
  .tsub{font-weight:800;font-size:12px;color:#33415c}
  .tsub.hit{color:#127a3c}
  .pend{font-weight:700;font-size:12px;color:#c2c9d4}
  .chk{display:inline-flex;align-items:center;justify-content:center;width:21px;height:21px;border-radius:50%;
    background:var(--green);color:#fff;font-size:12px;font-weight:900;line-height:1}
  .chk.empty{background:#fff;border:2px solid #cdd4de;color:transparent}
  .gstart{border-left:2px solid #c3ccd9}
  .grouphdr.gstart{border-left:3px solid #fff}
  .aename{font-weight:700;font-size:12.5px;line-height:1.1;display:inline}
  .aeteam{color:var(--muted);font-size:10.5px;margin-left:7px}
  .mval{font-weight:800;font-size:12px;color:#33415c}
  .mval.z{color:#b3bbc8}
  .circle{display:inline-flex;align-items:center;justify-content:center;min-width:54px;height:21px;border-radius:12px;
    font-weight:800;font-size:11px;background:var(--green);color:#fff;padding:0 8px}
  .frow{display:inline-flex;align-items:center;justify-content:center;gap:7px}
  .g5bar{height:5px;width:42px;border-radius:4px;background:#e9edf2;overflow:hidden;display:inline-block}
  .g5bar>i{display:block;height:100%;border-radius:4px}
  .g5pct{font-size:10px;font-weight:800;color:#6b7686;min-width:22px;text-align:left}
  .tot{font-weight:800;font-size:12.5px;color:var(--ink)}
  tr.altrow td{background:#f3f6fa}
  .banner{background:#fff7e6;border:1px solid #f0dca6;color:#8a6d1e;border-radius:12px;padding:14px 18px;margin-top:14px;font-size:14px}
  .pk{padding:1px 8px;border-radius:7px;display:inline-block;font-weight:800}
  .pk-decent{background:#eddac0;color:#8a5424;box-shadow:inset 0 0 0 1px #dcc09a}   /* bronze  $7.5M+ */
  .pk-good{background:#e2e7ed;color:#56626f;box-shadow:inset 0 0 0 1px #cdd4dd}     /* silver  $10M+ */
  .pk-best{background:#f6e39a;color:#7a5f0e;box-shadow:inset 0 0 0 1px #e6cd6a}     /* gold    $15M+ */

  /* ── Mobile stacked view (< 768px): hide the TV grid, show cards ── */
  .mroot{display:none}
  @media(max-width:768px){
    #fithost{display:none!important}
    .mroot{display:block}
    body{padding:10px}
  }
  .mroot .mhdr{background:linear-gradient(180deg,#fff 55%,#f5f8fb);border:1px solid var(--line);border-radius:14px;padding:12px 14px;margin-bottom:8px;box-shadow:0 1px 2px rgba(20,30,50,.05)}
  .mroot .mhdr .t1{font-size:18px;font-weight:800;letter-spacing:-.3px;line-height:1.05}
  .mroot .mhdr .t2{font-size:15px;font-weight:800;color:var(--green);margin-top:3px;display:inline-flex;align-items:center}
  .mroot .mhdr .t2::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--green);margin-right:6px}
  .mroot .mdays{display:flex;align-items:center;gap:9px;border-top:1px solid #e2e7ee;margin-top:9px;padding-top:9px}
  .mroot .mdays .n{font-size:30px;font-weight:800;color:var(--green);line-height:1;letter-spacing:-1px}
  .mroot .mdays .dt{font-size:13px;font-weight:800}
  .mroot .mdays .ds{font-size:10.5px;color:var(--muted);margin-top:2px}
  .mroot .kpi{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px}
  .mroot .tile{position:relative;overflow:hidden;border:1px solid var(--line);border-radius:14px;padding:10px 12px;background:#fff;box-shadow:0 1px 2px rgba(20,30,50,.05)}
  .mroot .tile::before{content:"";position:absolute;top:0;left:0;right:0;height:3px;background:var(--ac)}
  .mroot .tile .lab{font-size:10px;font-weight:800;letter-spacing:.4px;color:var(--muted);display:flex;align-items:center}
  .mroot .tile .lab::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--ac);margin-right:6px}
  .mroot .tile .big{font-size:20px;font-weight:800;margin-top:5px;line-height:1;color:var(--ai)}
  .mroot .tile .big span{font-size:12px;color:var(--muted);font-weight:600}
  .mroot .tile .sub{margin-top:5px;font-size:10.5px;color:var(--muted);line-height:1.35}
  .mroot .tv{--ac:#6b4fbb;--ai:#5b3ea8}
  .mroot .tp{--ac:#2a5bbf;--ai:#2a5bbf}
  .mroot .tf{--ac:#1a9e4e;--ai:#127a3c}
  .mroot .to{--ac:#e08a17;--ai:#9a6410}
  .mroot .pbar{height:6px;border-radius:5px;background:var(--track);margin-top:7px;overflow:hidden}
  .mroot .pbar>i{display:block;height:100%;border-radius:5px;background:var(--ac)}
  .mroot .odtot{display:flex;align-items:baseline;justify-content:space-between;gap:6px;border-top:1px solid #f0e2c9;margin-top:8px;padding-top:7px}
  .mroot .odtot .odk{font-size:9.5px;font-weight:800;letter-spacing:.3px;color:var(--muted)}
  .mroot .odtot .odv{font-size:18px;font-weight:800;color:var(--amber-ink);line-height:1}
  .mroot .seclabel{font-size:11px;font-weight:800;letter-spacing:.6px;color:#6b7686;margin:4px 2px 7px}
  .mroot .mc{position:relative;overflow:hidden;background:#fff;border:1px solid var(--line);border-radius:14px;padding:11px 12px 11px 15px;margin-bottom:8px;box-shadow:0 1px 2px rgba(20,30,50,.04)}
  .mroot .mc::before{content:"";position:absolute;top:0;bottom:0;left:0;width:4px;background:var(--tc,#c3ccd9)}
  .mroot .mc-h{display:flex;align-items:center;gap:9px}
  .mroot .rk{flex:0 0 24px;width:24px;height:24px;border-radius:50%;background:#eef1f6;color:#5c6a7a;font-weight:800;font-size:12px;display:flex;align-items:center;justify-content:center}
  .mroot .mc-nm{flex:1;min-width:0}
  .mroot .mc-nm .nm{font-weight:800;font-size:14px;line-height:1.1}
  .mroot .mc-nm .tm{color:var(--muted);font-size:11px;margin-top:1px}
  .mroot .mc-tot{text-align:right}
  .mroot .mc-tot .tl{font-size:9px;font-weight:800;color:var(--muted);letter-spacing:.4px}
  .mroot .mc-tot .tv{font-size:17px;font-weight:800;color:var(--ink);line-height:1}
  .mroot .mc-g{display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;margin-top:9px}
  .mroot .st{position:relative;overflow:hidden;border-radius:10px;padding:9px 8px 7px;background:#f7f9fc}
  .mroot .st::before{content:"";position:absolute;top:0;left:0;right:0;height:3px;background:var(--stac,#cfd6df)}
  .mroot .st .k{font-size:9px;font-weight:800;letter-spacing:.3px;color:var(--muted)}
  .mroot .st .v{font-size:14px;font-weight:800;margin-top:2px;line-height:1}
  .mroot .st .u{font-size:9.5px;color:var(--muted);margin-top:2px}
  .mroot .st.sg{--stac:#1a9e4e}
  .mroot .st.sb{--stac:#2a5bbf}
  .mroot .st.sa{--stac:#e08a17}
  .mroot .st.sg .v{color:var(--green-ink)}
  .mroot .st.sb .v{color:var(--b)}
  .mroot .st.sa .v{color:var(--amber-ink)}
  .mroot .st .bar{height:4px;border-radius:3px;background:#e4ebe6;margin-top:5px;overflow:hidden}
  .mroot .st .bar>i{display:block;height:100%;background:var(--green)}
  .mroot .mc-f{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}
  .mroot .chip{font-size:10.5px;color:#5c6a7a;background:#f2f5f9;border-radius:20px;padding:3px 9px;font-weight:600}
  .mroot .chip .hit{color:var(--green-ink)}
  .mroot .banner{background:#fff7e6;border:1px solid #f0dca6;color:#8a6d1e;border-radius:12px;padding:14px 16px;font-size:14px;margin-top:8px}
`;
