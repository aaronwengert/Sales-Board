export const SHELL = `
<div class="wrap">
  <header>
    <div class="titlewrap">
      <img class="logo" src="/logo.png" alt="Oaktree Funding Corp">
      <div class="brand">
        <h1>Wholesale Sales Production - <span id="titlemonth">—</span></h1>
        <div class="sub">vs $100M wholesale goal</div>
      </div>
    </div>
    <div class="clock">
      <div class="daysleft"><span class="dl-n tnum" id="fdleft">—</span><span class="dl-t">funding days left</span><span class="dl-sub" id="fdsub">—</span></div>
      <div class="u">Last update: <span id="clocktime">—</span></div>
      <div class="u">Call report: <span id="callclocktime">—</span></div>
    </div>
  </header>
  <div class="kpiband">
    <div class="kspace"></div>
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
`;
