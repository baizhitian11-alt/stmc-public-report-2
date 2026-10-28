(() => {
  'use strict';
  function removeSelection(){
    document.querySelectorAll('[data-muse-selection-toolbar], .muse-select-source').forEach(node=>node.remove());
  }
  globalThis.MuseReportSelection={mount:removeSelection};
  removeSelection();
})();
