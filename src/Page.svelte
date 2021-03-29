<div class="page" style={`z-index: ${zIndex}; left:${left}; width: ${width}%; overflow: hidden;`}>
  <div style={`position: relative; width: ${pageWidth}px; height: 100%; overflow: hidden;`}>
    <object type="image/svg+xml" data={svg} style="width: 100%; height: 100%;" title="page"></object>
    <div style={`background: ${gradient}; pointer-events: none;`} class="page-shadow"/>
  </div>
</div>

<script>
  export let doc;
  export let number;
  export let progress;
  export let pageWidth;
  export let shadowColor;
  export let shadowIntensity;
  export let shadow;

  $:even = (number % 2) == 0;
  $:zIndex = (even ? -number : number);
  $:svg = `./documents/${doc}/${number}.svg`;
  $:left = even ? "50%" : `${(1 - progress) * 100}%`;
  $:width = even ? (1 - progress) * 50 : progress * 50;
  $:gradient = shadow ? (
    even ? `linear-gradient(90deg, #${shadowColor} 0%, rgba(0,0,0,0) ${shadowIntensity}%)` : 
    `linear-gradient(270deg, #${shadowColor} ${(1 - progress) * 100}%, rgba(0,0,0,0) ${(1 - progress) * 100 + shadowIntensity}%)`
  ) : "#00000000";
</script>

<style>
  .page {
    height: 100%;
    top: 0px;
    position: absolute;
  }

  .page-shadow {
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0px;
    left: 0px;
  }
</style>