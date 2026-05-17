  // ── WhatsApp actions ──────────────────────────────────────────────────────
  $("btnFocusWa").addEventListener("click", async () => {
    await bridge.focusMain();
    showToast("WhatsApp window focused");
  });
  $("btnOpenPanel").addEventListener("click", async () => {
    await bridge.focusMain();
    await bridge.waOpenPanel();
    showToast("Opening Pro Sender…");
  });
  $("btnScheduler").addEventListener("click", async () => {
    await bridge.focusMain();
    await bridge.waOpenPanel();
    await bridge.waExecute("window.dispatchEvent(new CustomEvent('cwp:openTab',{detail:'scheduler'}));");
    showToast("Opening Scheduler…");
  });
  $("btnAutoReply").addEventListener("click", async () => {
    await bridge.focusMain();
    await bridge.waOpenPanel();
    await bridge.waExecute("window.dispatchEvent(new CustomEvent('cwp:openTab',{detail:'autoreply'}));");
    showToast("Opening Auto Reply…");
  });
  $("btnContacts").addEventListener("click", async () => {
    await bridge.focusMain();
    await bridge.waOpenPanel();
    await bridge.waExecute("window.dispatchEvent(new CustomEvent('cwp:openTab',{detail:'contacts'}));");
    showToast("Opening Contacts…");
  });
