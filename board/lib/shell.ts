export const SHELL = `
<div id="fithost">
<div class="wrap">
  <div class="kpiband">
    <div class="cluster">
      <div class="cl-top">
        <img class="logo" src="/logo.png" alt="Oaktree Funding Corp">
        <div class="cl-brand">
          <div class="cl-title" id="boardtitle">—</div>
          <div class="cl-month" id="titlemonth">—</div>
        </div>
      </div>
      <div class="cl-days">
        <span class="dl-n tnum" id="fdleft">—</span>
        <div class="dl-meta">
          <div class="dl-t">funding days left</div>
          <div class="dl-sub"><span id="fdsub">—</span> &middot; upd <span id="clocktime">—</span> &middot; calls <span id="callclocktime">—</span></div>
          <div class="deadlines" id="deadlines" style="display:none"></div>
        </div>
      </div>
    </div>
    <div class="card k-violet kt-today">
      <div class="krow"><span class="klabel">TODAY&rsquo;S GOAL</span><span class="pill subs" id="subpill">—</span></div>
      <div class="big tnum" id="goalpct">—</div>
      <div class="pacebar"><i id="goalbar" style="width:0%;background:#6b4fbb"></i></div>
      <div class="pnote" id="goalsub">—</div>
    </div>
    <div class="card k-blue kt-pipe">
      <div class="krow"><span class="klabel">SALES TEAM PIPELINE</span><span class="pill mtd" id="mtdpill">—</span></div>
      <div class="big tnum" id="pipebig">—</div>
      <div class="psplit">
        <div class="h"><div class="k">LOCKED</div><div class="v tnum" id="lockv">—</div></div>
        <div class="h"><div class="k">NOT LOCKED</div><div class="v tnum" id="unlockv">—</div></div>
      </div>
    </div>
    <div class="card k-green kt-funded">
      <div class="krow"><span class="klabel">FUNDED PRODUCTION</span><span class="pill behind" id="pacepill">—</span></div>
      <div class="big tnum" id="fundbig">—</div>
      <div class="pacebar"><i id="pacefill" style="width:0%"></i><span class="mk" id="pacemk" style="left:0%"></span></div>
      <div class="pnote" id="fundnote">—</div>
    </div>
    <div class="card combo k-amber kt-ondeck">
      <div class="krow"><span class="klabel">ON DECK</span></div>
      <div class="split">
        <div class="half"><div class="k">CTC+</div><div class="v tnum" id="ctcv">—</div></div>
        <div class="half"><div class="k">FUNDED &amp; CTC+</div><div class="v tnum" id="fctcv">—</div></div>
      </div>
    </div>
  </div>
  <div class="goals"><table id="tbl"></table></div>
</div>
</div>
<div id="mroot" class="mroot"></div>
`;
