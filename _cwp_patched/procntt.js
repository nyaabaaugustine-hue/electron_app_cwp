var pro_close_img_src = chrome.runtime.getURL("logo/pro-closeBtn.png");
var pro_free_trial_src = chrome.runtime.getURL("logo/pro-free-trial.png");
var pro_advance_promo_src = chrome.runtime.getURL("logo/pro_advance_promo.png");
var pro_success_gif = chrome.runtime.getURL("logo/pro-success.gif");
var pro_recommend_tick = chrome.runtime.getURL("logo/pro-tickmark.png");
var pro_export_chat_contacts_img_src = chrome.runtime.getURL(
  "logo/pro-export-unsaved-contacts.png"
);
var pro_export_img_src = chrome.runtime.getURL("logo/pro-export.png");
var pro_export_contacts_text_src = chrome.runtime.getURL(
  "logo/pro-export-contact.svg"
);
var pro_email_icon_src = chrome.runtime.getURL("logo/pro-email.png");
var pro_error_icon_src = chrome.runtime.getURL("logo/pro-error.png");
var pro_help_icon_src = chrome.runtime.getURL("logo/pro-help.png");
var pro_read_icon_src = chrome.runtime.getURL("logo/pro-read.png");
var pro_wall_clock_white_icon = chrome.runtime.getURL(
  "logo/pro-wall-clock-white.png"
);
var pro_smile_icon = chrome.runtime.getURL("logo/pro-smile.png");
var logo_img = chrome.runtime.getURL("logo/pro-logo-img.png");
var large_logo_img = chrome.runtime.getURL("logo/large.png");
var medium_logo_img = chrome.runtime.getURL("logo/pro-medium.png");
var logo_text = chrome.runtime.getURL("logo/pro-logo-text.png");
var logo_text_light = chrome.runtime.getURL("logo/pro-logo-text-light.png");
var pro_arrow_left = chrome.runtime.getURL("logo/pro-arrow-left.png");
var pro_arrow_right = chrome.runtime.getURL("logo/pro-arrow-right.png");
var pro_bulb_icon = chrome.runtime.getURL("logo/pro-lightbulb.png");
var pro_how_to_use1 = chrome.runtime.getURL("logo/pro-how-to-use-1.gif");
var pro_how_to_use2 = chrome.runtime.getURL("logo/pro-how-to-use-2.gif");
var pro_how_to_use3 = chrome.runtime.getURL("logo/pro-how-to-use-3.gif");
var pro_man_thinking = chrome.runtime.getURL("logo/pro-man-thinking.png");
var pro_cross_icon_src = chrome.runtime.getURL("logo/pro-close-1.png");
var pro_check_icon_src = chrome.runtime.getURL("logo/pro-check-mark.png");
var pro_eye_visible = chrome.runtime.getURL("logo/pro-eye-visible.png");
var pro_eye_hidden = chrome.runtime.getURL("logo/pro-eye-hidden.png");
var pro_pause_icon_src = chrome.runtime.getURL("logo/pro-pause_logo.png");
var pro_alarm_clock = chrome.runtime.getURL("logo/pro_alarm_clock.png");
var pro_yellow_star = chrome.runtime.getURL("logo/pro_yellow-star.png");
var pro_multiple_users_icon = chrome.runtime.getURL(
  "logo/pro_multiple-users.png"
);
var pro_down_arrow = chrome.runtime.getURL("logo/pro-down-arrow.png");
var pro_drag_icon = chrome.runtime.getURL("logo/pro-drag-icon.png");
var pro_delete_icon = chrome.runtime.getURL("logo/pro-delete-icon.png");
var pro_attach_icon = chrome.runtime.getURL("logo/pro_attach_symbol.png");
var pro_edit_icon = chrome.runtime.getURL("logo/pro-edit_icon.png");
var pro_logo_new = chrome.runtime.getURL("logo/pro-new-logo.png");

let link = document.createElement("link");
link.rel = "stylesheet";
link.href =
  "https://fonts.googleapis.com/css2?family=Palanquin+Dark:wght@400;500;700&family=PT+Sans+Caption&family=Reem+Kufi+Ink&display=swap";
document.head.appendChild(link);

let my_number = null,
  logged_in_user = null,
  plan_type = "Expired",
  last_plan_type = "Basic",
  plan_duration = "";
let expiry_date = null;

var rows = [],
  notifications_hash = {},
  stop = false,
  pause = false,
  groupIdToName = {},
  contactIdToName = {};

let isProfile = false;

var messages = [
  "Hello! how can we help you?",
  "Hello!",
  "Thank you for using service!",
],
  total_messages = 0;

// Quick Reply Feature Variables
var totalConvertedSize = 0;       // Track total size of converted images (bytes)
var imageData = null;              // Temporary storage for image during upload
var reload_quick_reply_div = true; // Flag to reload quick reply display

var location_info = {
  name: "international",
  name_code: "US",
  currency: "USD",
  default: true,
};

var cancelDelay;

var init_store_type = null,
  whatsapp_version = null,
  extension_version = chrome.runtime.getManifest().version;

// setting premium usage object in the local
let premiumUsageObject = {
  lastDate: new Date().getDate(),
  lastMonth: new Date().getMonth(),
  attachment: false,
  customisation: false, // feature where???
  groupContactExport: false,
  quickReplies: false,
  caption: false,
  stop: false,
  timeGap: false,
  batching: false,
};

if (isAdvanceFeatureAvailable() || isExpired()) {
  premiumUsageObject = {
    ...premiumUsageObject,
    multipleAttachment: false,
    schedule: false,
  };
}

function setPremiumUsageObject() {
  chrome.storage.local.get(["premiumUsageObject"], function (result) {
    if (result.premiumUsageObject !== undefined) {
      const day = result.premiumUsageObject.lastDate;
      const presentDay = new Date().getDate();
      let diffInDays;
      if (presentDay >= day) {
        diffInDays = presentDay - day;
      } else {
        diffInDays = 30 - day + presentDay;
      }
      if (diffInDays >= 14) {
        chrome.storage.local.set({ premiumUsageObject: premiumUsageObject });
      }
    } else {
      chrome.storage.local.set({ premiumUsageObject: premiumUsageObject });
    }
  });
}
setPremiumUsageObject();

// For injecting api js
(function addInject() {
  let jsPath = "/js/proinjt.js";
  let script_element = document.createElement("script");
  script_element.setAttribute("type", "text/javascript");
  script_element.setAttribute("id", "inject");
  script_element.src = chrome.runtime.getURL(jsPath);
  script_element.onload = function () {
    this.parentNode.removeChild(this);
  };
  document.head.appendChild(script_element);
})();

// InjectJS Message Listener
window.addEventListener("message", injectMessageListner, false);

function injectMessageListner(event) {
  if (event.source != window || !event.data.type) return;

  let message_type = event.data.type;
  let message_payload = event.data.payload;
  console.log("message_type", message_type);
  console.log("message_payload", message_payload);

  // Handle error and success
  if (message_payload) {
    if (message_payload.error) {
      trackError(message_type, message_payload.error);
    } else if (message_type.includes("send")) {
      trackSuccess(message_type + "_success");
    }
  }

  // Handle message type
  switch (message_type) {
    case "get_init_store_type":
      init_store_type = localStorage.getItem("pro-sender::init_store_type");
      if (!init_store_type || init_store_type != message_payload) {
        init_store_type = message_payload;
        localStorage.setItem("pro-sender::init_store_type", init_store_type);
        trackSystemEvent("init_store_type", init_store_type);
      }
      break;

    case "get_whatsapp_version":
      whatsapp_version = localStorage.getItem("pro-sender::whatsapp-version");
      if (!whatsapp_version || whatsapp_version != message_payload) {
        whatsapp_version = message_payload;
        localStorage.setItem("pro-sender::whatsapp-version", whatsapp_version);
        trackSystemEvent("whatsapp_version", whatsapp_version);
      }
      break;

    case "get_all_groups":
      setGroupDataToLocalStorage(message_payload);
      break;

    case "get_all_contacts":
      setContactDataToLocalStorage(message_payload);
      break;

    case "get_all_labels":
      setLabelDataToLocalStorage(message_payload);
      break;

    // Handle send_message responses
    case "send_message_to_number":
      resolveSendMessageToNumber(message_payload);
      break;
    case "send_message_to_number_new_error":
      rejectSendMessageToNumber(message_payload);
      break;

    case "send_message_to_group":
      resolveSendMessageToGroup(message_payload);
      break;
    case "send_message_to_group_error":
      rejectSendMessageToGroup(message_payload);
      break;

    // Handle send_attachments responses
    case "send_attachments_to_number":
    case "send_attachments_to_number_error":
      if (typeof resolveSendAttachmentsToNumber === "function") {
        resolveSendAttachmentsToNumber(message_payload);
      }
      break;

    case "send_attachments_to_group":
    case "send_attachments_to_grpup_error": // Note: maintaining the typo in original for now or fix it
      if (typeof resolveSendAttachmentsToGroup === "function") {
        resolveSendAttachmentsToGroup(message_payload);
      }
      break;

    // Handle incoming messages for chatbot
    case "incoming_message":
      if (message_payload && message_payload.body) {
        processChatbotMessageFromStore(message_payload);
      }
      break;

    default:
      break;
  }
}

function download_group_contacts() {
  let conv_header = getDocumentElement("conversation_header");
  if (!conv_header) return;

  // Detect group chat by checking for group icon in header
  // WhatsApp no longer puts @g.us in DOM data attributes
  const groupIcon = conv_header.querySelector('[data-icon*="group"], [data-icon="default-group-refreshed"], [aria-label="Group video call"], [title*=","]');
  if (!groupIcon) return;

  let groupTitleElement = getDocumentElement("conversation_title_div");
  let groupTitle = groupTitleElement ? groupTitleElement.innerText : "Group";

  let download_group_btn = document.createElement("div");

  let export_contacts_text = document.createElement("span");
  export_contacts_text.classList.add("export_contacts_text");
  let export_contacts_text_class = "";

  if (document.body.classList.contains("dark")) {
    export_contacts_text_class = "export_gif_bright";
  }

  export_contacts_text.innerHTML = ` <img class="export_gif ${export_contacts_text_class}" src=${pro_export_contacts_text_src} />`;

  download_group_btn.id = "download_group_btn";
  download_group_btn.className = "CtaBtn shimmer";
  download_group_btn.innerHTML = `<img src=${pro_export_img_src} />`;
  download_group_btn.appendChild(export_contacts_text);

  chrome.storage.local.get(
    ["coeu862", "ldeu863", "groupDataForShimmer"],
    function (result) {
      let today = new Date().toDateString();
      let coeu862 = result.coeu862 || 0;
      let ldeu863 = result.ldeu863 || "";
      let groupDataForShimmer = result.groupDataForShimmer || [{}];

      if (today !== ldeu863) {
        ldeu863 = today;
        coeu862++;
        chrome.storage.local.set({
          coeu862: coeu862,
          ldeu863: ldeu863,
        });
      }

      if (coeu862 <= 5) {
        let groupIndex = groupDataForShimmer.findIndex(
          (group) => group.groupName === groupTitle
        );
        if (groupIndex !== -1) {
          if (
            groupDataForShimmer[groupIndex].lastShimmerDay !== today &&
            groupDataForShimmer[groupIndex].shimmerCount <= 5
          ) {
            groupDataForShimmer[groupIndex].lastShimmerDay = today;
            groupDataForShimmer[groupIndex].shimmerCount =
              groupDataForShimmer[groupIndex].shimmerCount + 1;
            chrome.storage.local.set({
              groupDataForShimmer: groupDataForShimmer,
            });
          } else {
            download_group_btn.classList.remove("shimmer");
            export_contacts_text.innerHTML = `Export Contacts`;
          }
        } else {
          groupDataForShimmer.push({
            groupName: groupTitle,
            lastShimmerDay: today,
            shimmerCount: 1,
          });
          chrome.storage.local.set({
            groupDataForShimmer: groupDataForShimmer,
          });
        }
        setTimeout(() => {
          download_group_btn.classList.remove("shimmer");
          export_contacts_text.innerHTML = `Export Contacts`;
        }, 5000);
      } else {
        download_group_btn.classList.remove("shimmer");
        export_contacts_text.innerHTML = `Export Contacts`;
      }
    }
  );

  conv_header.insertBefore(download_group_btn, conv_header.childNodes[1]);
  let groupTitleParent = groupTitleElement?.parentElement?.parentElement;
  if (groupTitleElement) {
    groupTitleParent.style.overflowX = "hidden";
  }

  download_group_btn.addEventListener("click", function () {
    if (isPremiumFeatureAvailable()) {
      window.dispatchEvent(
        new CustomEvent("PROS::export-group", {
          detail: {
            groupId: null,
          },
        })
      );
      trackButtonClick("download_group_contacts_premium");
    } else {
      premium_reminder("download_group_contacts", "Premium");
    }
    // updating premium usage for group contact export
    chrome.storage.local.get(["premiumUsageObject"], function (result) {
      if (result.premiumUsageObject !== undefined) {
        let updatedPremiumUsageObject = {
          ...result.premiumUsageObject,
          groupContactExport: true,
        };
        chrome.storage.local.set({
          premiumUsageObject: updatedPremiumUsageObject,
        });
      }
    });

    trackButtonClick("download_group_contacts");
  });
}

function profile_header_buttons() {
  const profile_header = getDocumentElement("profile_header");
  if (!profile_header) return;

  const profile_header_buttons_div = document.createElement("div");
  profile_header_buttons_div.id = "profile_header_buttons_div";

  const profile_header_buttons_list = profile_header.children[0];
  profile_header_buttons_list.insertBefore(
    profile_header_buttons_div,
    profile_header_buttons_list.children[0]
  );

  // Profile Header Buttons
  add_profile_header_btn(
    "pro_profile",
    "Profile - Pro Sender",
    medium_logo_img,
    pro_profile_popup
  );
  add_profile_header_btn(
    "blur_contacts",
    "Blur chat, contact name and profile picture - Pro Sender",
    pro_eye_hidden,
    show_blur_dropdown
  );
  add_profile_header_btn(
    "download_unsaved_contacts",
    "Export unsaved contacts - Pro Sender",
    pro_export_chat_contacts_img_src,
    download_unsaved_contacts
  );

  // Handle other
  const new_chat_btn = getDocumentElement("new_chat_btn");
  if (new_chat_btn && !new_chat_btn.classList.contains("CtaBtn")) {
    new_chat_btn.classList.add("CtaBtn");
  }
  const new_chat_parent = getDocumentElement("new_chat_parent");
  if (new_chat_parent) {
    new_chat_btn.title = "";
    handleShowTooltip({
      query: DOCUMENT_ELEMENT_SELECTORS["new_chat_parent"][0],
      text: "New chat",
      bottom: "-30px",
    });
  }
}

function add_profile_header_btn(btn_id, btn_title, btn_image = null, on_click) {
  const profile_header_buttons_div = document.querySelector(
    "#profile_header_buttons_div"
  );
  if (!profile_header_buttons_div) return;

  const existing_btn = document.querySelector(`#${btn_id}`);
  if (existing_btn) return;

  const btn = document.createElement("div");
  btn.id = btn_id;
  btn.classList.add("profile_header_button");
  btn.innerHTML = `<img src=${btn_image} class='${btn_id}_icon CtaBtn' alt='${btn_id}'>`;
  btn.addEventListener("click", on_click);

  profile_header_buttons_div.appendChild(btn);
  handleShowTooltip({
    query: `#${btn_id}`,
    text: btn_title,
    bottom: "-30px",
  });
}

// âœ… ADVANCED: Dropdown menu with saved + unsaved contacts options
function download_unsaved_contacts() {
  const parentDiv = document.querySelector('#profile_header_buttons_div');
  if (!parentDiv) {
    console.warn("Profile header buttons div not found");
    return;
  }

  // Toggle dropdown - if exists, remove it
  if (document.querySelector('#export_options')) {
    parentDiv.removeChild(document.querySelector('#export_options'));
    return;
  }

  // Create dropdown menu
  let mainDiv = document.createElement("div")
  mainDiv.id = "export_options"
  mainDiv.innerHTML = `
  <div id="saved_contacts" class="export_option">
      <button class="contacts_btn">
          <img class="contacts_img" src="${pro_export_img_src}">
      </button> 
      Download unsaved contacts
  </div>
  <div id="unsaved_contacts" class="export_option">
      <button class="contacts_btn">
          <img class="contacts_img" src="${pro_export_chat_contacts_img_src}">
      </button> 
      Download chat contacts
  </div>    
  `

  parentDiv.append(mainDiv)

  // Handle "Saved Contacts" click
  document.getElementById("saved_contacts").addEventListener("click", () => {
    if (isAdvanceFeatureAvailable()) {
      window.dispatchEvent(new CustomEvent("PROS::export-saved-contacts", {
        detail: { type: "Advance" }
      }));
      trackButtonClick("download_saved_contacts_premium");
    } else {
      window.dispatchEvent(new CustomEvent("PROS::export-saved-contacts", {
        detail: { type: "Expired" }
      }));
    }
    chrome.storage.local.get(['premiumUsageObject'], (result) => {
      if (result.premiumUsageObject !== undefined) {
        let updatedPremiumUsageObject = {
          ...result.premiumUsageObject,
          downloadSavedContacts: true,
        };
        chrome.storage.local.set({ premiumUsageObject: updatedPremiumUsageObject });
      }
    });
    mainDiv.remove()
  })

  // Handle "Unsaved Contacts" click
  document.getElementById("unsaved_contacts").addEventListener("click", () => {
    if (isAdvanceFeatureAvailable()) {
      window.dispatchEvent(new CustomEvent("PROS::export-unsaved-contacts", {
        detail: { type: "Advance" }
      }));
      trackButtonClick("download_unsaved_contacts_premium");
    } else {
      window.dispatchEvent(new CustomEvent("PROS::export-unsaved-contacts", {
        detail: { type: "Expired" }
      }));
    }
    chrome.storage.local.get(['premiumUsageObject'], (result) => {
      if (result.premiumUsageObject !== undefined) {
        let updatedPremiumUsageObject = {
          ...result.premiumUsageObject,
          downloadUnsavedContacts: true,
        };
        chrome.storage.local.set({ premiumUsageObject: updatedPremiumUsageObject });
      }
    });
    mainDiv.remove()
  })

  trackButtonClick("download_contacts");
}

async function showBuyPremiumButtons() {
  let pricing_data;
  if (last_plan_type == "FreeTrial" || plan_type == "FreeTrial")
    pricing_data = PRICING_DATA["free_trial_expired"];
  else pricing_data = PRICING_DATA["premium_expired"];
  if (!pricing_data) return "";

  let {
    name: country_name,
    name_code: country_code,
    currency: country_currency,
  } = location_info;
  if (Object.keys(COUNTRY_WITH_SPECIFIC_PRICING).includes(country_code)) {
    country_name = COUNTRY_WITH_SPECIFIC_PRICING[country_code];
  } else {
    country_name = "international";
  }

  let pricing_link = `https://cybergh.netlify.app/checkout/?country=${country_name}&phone=${my_number}&plan=`;

  let advancePrice = pricing_data.advance_price[country_name];
  let basicPrice = pricing_data.basic_price[country_name];
  let advanceConvertedPrice = await convertPriceToLocale(
    advancePrice.substring(1)
  );
  let basicConvertedPrice = await convertPriceToLocale(basicPrice.substring(1));

  if (
    plan_type == "FreeTrial" ||
    (plan_type == "Expired" && last_plan_type == "FreeTrial")
  ) {
    return getFreeTrialButtonHtml();
  } else if (plan_type == "Expired") {
    if (last_plan_type == "Basic") {
      let { basicButtonHtml, advanceButtonHtml } =
        await getBasicPremiumExpiredButton(
          basicPrice,
          basicConvertedPrice,
          advancePrice,
          advanceConvertedPrice,
          pricing_link
        );
      return basicButtonHtml + advanceButtonHtml;
    } else if (last_plan_type == "Advance") {
      let advanceButtonHtml = await getAdvancePremiumExpiredButton(
        advancePrice,
        advanceConvertedPrice,
        pricing_link
      );
      return advanceButtonHtml;
    }
  } else {
    let buttonHtml = `<div style="width:100%;display:flex;justify-content:center;align-items:center;">
                <a href="https://cybergh.netlify.app/multiple-account?numAccounts=10&country=${country_name}" target="_blank" style="color:#009a88;font-size:12px;text-decoration:underline;">Purchase for multiple users</a>
            </div>`;
    return buttonHtml;
  }
}

async function pro_profile_popup() {
  const parentDiv = document.querySelector("#profile_header_buttons_div");
  if (!parentDiv) return;

  if (document.querySelector("#pro_profile_popup")) {
    parentDiv.removeChild(document.querySelector("#pro_profile_popup"));
    return;
  }

  const mainDiv = document.createElement("div");
  mainDiv.id = "pro_profile_popup";
  mainDiv.classList.add("pro_profile_main");
  mainDiv.dir = "ltr";

  const topSection = document.createElement("div");
  topSection.classList.add("pro_profile_top");
  topSection.innerHTML = `
    <div class="pro_profile_cross" id="close_pro_profile_popup">
      <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M405 136.798L375.202 107 256 226.202 136.798 107 107 136.798 226.202 256 107 375.202 136.798 405 256 285.798 375.202 405 405 375.202 285.798 256z"></path></svg>
    </div>
    <div class="pro_profile_logo">
         <div class="pro_profile_text">
             <img src="${logo_text_light}" alt="">
         </div>
    </div>`;

  const bodySection = document.createElement("div");
  bodySection.classList.add("pro_profile_body");

  let bodyHtml = await new Promise((resolve) => {
    chrome.storage.local.get(
      [
        "my_number",
        "plan_type",
        "customer_name",
        "customer_email",
        "expiry_date",
      ],
      async function (result) {
        let bodyHtml = "";
        const order = [
          { key: "customer_name", label: "Name" },
          { key: "customer_email", label: "Email" },
          { key: "my_number", label: "Number" },
          { key: "plan_type", label: "Plan Type" },
          { key: "expiry_date", label: "Expiry Date" },
        ];

        for (const item of order) {
          let label = item.label;
          let value = result[item.key];
          if (item.key === "my_number" && value) {
            value = `+${value}`;
          } else if (item.key === "expiry_date" && value) {
            value = new Date(value).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            });
          }

          // const translatedLabel = await translate(item.label);
          if (value) {
            bodyHtml += `
                    <div class="pro_rows">
                        <p class="pro_col pro_col_end"><span>${label}</span> <span>:</span></p>
                        <span class="pro_col">${value}</span>
                    </div>`;
          }
        }

        resolve(bodyHtml);
      }
    );
  });

  const buyPremiumHtml = await showBuyPremiumButtons();
  bodyHtml += `<div class="premium_feature_block" id="buy_premium_block" style="border:none;display:flex;justify-content:center;align-items:center;gap:10px;flex-wrap:wrap;" dir="ltr">${buyPremiumHtml}</div>`;

  bodySection.innerHTML = bodyHtml;

  if (currentLanguage === "es") {
    mainDiv.style.top = "35%";
  }

  mainDiv.append(topSection);
  mainDiv.append(bodySection);

  parentDiv.appendChild(mainDiv);

  let close_popup_btn = document.getElementById("close_pro_profile_popup");
  close_popup_btn.addEventListener("click", () => {
    parentDiv.removeChild(mainDiv);
  });
}


async function show_blur_dropdown() {
  try {
    // Check if already open
    const existingDropdown = document.querySelector('#blur_dropdown');
    if (existingDropdown) {
      existingDropdown.remove();
      return;
    }

    // Create main container
    const mainDiv = document.createElement("div");
    mainDiv.id = "blur_dropdown";
    mainDiv.classList.add("pro_profile_popup", "blur_main");
    mainDiv.dir = "ltr";

    // Create top section with close button and title
    const topSection = document.createElement("div");
    topSection.classList.add("pro_profile_top");
    topSection.innerHTML = `
        <div class="pro_profile_cross" id="close_blur_dropdown">
            <svg stroke="currentColor" fill="currentColor" stroke-width="0" 
                viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                <path d="M405 136.798L375.202 107 256 226.202 136.798 107 
                         107 136.798 226.202 256 107 375.202 136.798 405 
                         256 285.798 375.202 405 405 375.202 285.798 256z"></path>
            </svg>
        </div>
        <div style="gap:20px" class="pro_profile_logo">
            <div class="pro_profile_img blur_img">
                <img style="height:40px;width:40px" src="${pro_logo_new}" alt="">
            </div>
            <h1 style="font-size:25px;color:#ffffff;">Blur Settings</h1>
        </div>`;

    // Define blur options
    const blurOptions = [
      { key: 'blur_chat_name', label: 'Chat Name' },
      { key: 'blur_profile_pic', label: 'Profile Picture' },
      { key: 'blur_chat_messages', label: 'Chat Messages' },
    ];

    // Create body section with checkboxes
    const bodySection = document.createElement("div");
    bodySection.classList.add("pro_profile_body", "blur_body");

    // Load saved preferences
    const storedValues = await chrome.storage.local.get(blurOptions.map(opt => opt.key));

    // Build HTML for checkboxes
    let html = '';
    for (const item of blurOptions) {
      const checked = storedValues[item.key] ? 'checked' : '';
      html += `
          <div class="pro_rows blur_rows">
              <p class="pro_col pro_col_end blur_end">
                  <input type="checkbox" class="blur_checkbox" id="${item.key}" ${checked}>
              </p>
              <span class="pro_col">${item.label}</span>
          </div>`;
    }
    html += `<button class="blur_btn" id="blur_btn">Blur</button>`;
    bodySection.innerHTML = html;

    // Add event listeners to checkboxes
    bodySection.querySelectorAll('.blur_checkbox').forEach((checkbox) => {
      checkbox.addEventListener('change', async () => {
        // âœ… FIX: Save setting and immediately update blur
        await chrome.storage.local.set({ [checkbox.id]: checkbox.checked });
        // âœ… FIX: Update blur effect in real-time
        await toggle_blur(false);
      });
    });

    // Append sections and add to page
    mainDiv.append(topSection, bodySection);

    // âœ… FIX: Append to blur button container for relative positioning
    const blurContactsBtn = document.getElementById("blur_contacts");
    if (blurContactsBtn && blurContactsBtn.parentElement) {
      // Set parent to position relative for absolute positioning to work
      blurContactsBtn.parentElement.style.position = "relative";
      blurContactsBtn.parentElement.appendChild(mainDiv);
    } else {
      // Fallback to document body if button not found
      document.body.appendChild(mainDiv);
    }

    // Blur button click handler
    document.getElementById("blur_btn").addEventListener("click", async (e) => {
      e.stopPropagation();
      await chrome.storage.local.set({ isBlurred: true });
      await toggle_blur(true);
      mainDiv.remove();
    });

    // Close button click handler
    document.getElementById("close_blur_dropdown").addEventListener("click", (e) => {
      e.stopPropagation();
      mainDiv.remove();
    });
  } catch (error) {
    console.error("Error :: show_blur_dropdown :: ", error);
  }
}


async function toggle_blur(click_event) {
  try {
    const blurContactsBtn = document.getElementById("blur_contacts");
    if (!blurContactsBtn) {
      console.warn("Blur button not found");
      return;
    }

    const { isBlurred } = await chrome.storage.local.get("isBlurred");
    const blurKeys = ['blur_chat_name', 'blur_profile_pic', 'blur_chat_messages'];
    const blurSettings = await chrome.storage.local.get(blurKeys);

    // âœ… FIX: Check if ANY blur option is enabled
    const hasAnyBlurEnabled = Object.values(blurSettings).some(val => val === true);
    // Define what elements to blur for each setting
    const blurGroups = {
      blur_chat_name: [
        getDocumentElement('conversation_header_name_div'),
        ...getDocumentElement('left_side_contacts_name', true)
      ],
      blur_profile_pic: [
        ...getDocumentElement('contact_profile_div', true),
        ...getDocumentElement("conversation_panel_profile", true)
      ],
      blur_chat_messages: [
        ...getDocumentElement('conversation_message_div', true),
        ...getDocumentElement("left_side_contacts_message", true),
        ...getDocumentElement('conversation_non_message_div', true)
      ],
    };

    // âœ… FIX: Quick reply div should only blur if "Chat Messages" option is enabled
    const replyDiv = document.querySelector('#reply_div');
    if (replyDiv) {
      if (isBlurred && blurSettings['blur_chat_messages']) {
        // Only blur if blur is active AND "Chat Messages" option is specifically enabled
        applyOrRemoveBlur(replyDiv, 'blur', true);
      } else {
        // Remove blur if blur inactive OR "Chat Messages" not enabled
        applyOrRemoveBlur(replyDiv, 'blur', false);
      }
    }

    // âœ… FIX: Apply or remove blur based on settings
    for (const [key, elements] of Object.entries(blurGroups)) {
      elements.forEach(el => {
        if (blurSettings[key] && isBlurred) {
          // Apply blur if setting enabled AND isBlurred is true
          applyOrRemoveBlur(el, 'blur', true);
        } else {
          // Remove blur if setting disabled OR isBlurred is false
          applyOrRemoveBlur(el, 'blur', false);
        }
      });
    }

    // âœ… FIX: Update button state and icon based on blur status
    if (click_event) {
      // Update button class
      if (isBlurred && hasAnyBlurEnabled) {
        blurContactsBtn.classList.add('blurred');
      } else {
        blurContactsBtn.classList.remove('blurred');
      }

      // âœ… FIX: Update icon based on blur status
      const iconSrc = (isBlurred && hasAnyBlurEnabled) ? pro_eye_visible : pro_eye_hidden;
      blurContactsBtn.innerHTML = `<img class='blur_icon' src=${iconSrc} alt='blur-info'>`;

      if (isBlurred && hasAnyBlurEnabled) {
        trackButtonClick('blur_contacts');
      }
    }
  } catch (e) {
    console.error("Error :: toggle_blur :: ", e);
  }
}

function applyOrRemoveBlur(element, className, shouldApply) {
  try {
    if (!element) return;

    if (shouldApply) {
      element.classList.add(className);
    } else {
      element.classList.remove(className);
    }
  } catch (error) {
    console.log(error);
  }
}

function suggestion_messages() {
  var reply_div = document.getElementById("reply_div");
  if (reply_div) reply_div.parentNode.removeChild(reply_div);
  var smart_reply_edit_button = document.getElementById(
    "smart_reply_edit_button"
  );
  if (smart_reply_edit_button)
    smart_reply_edit_button.parentNode.removeChild(smart_reply_edit_button);

  var footer = getDocumentElement("footer_div");
  if (!footer) return;
  footer.style.paddingTop = "36px";

  reply_div = document.createElement("div");
  reply_div.id = "reply_div";
  reply_div.style.position = "absolute";
  reply_div.style.top = "0";
  reply_div.style.zIndex = "1";
  reply_div.style.width = "100%";
  reply_div.style.display = "flex";
  reply_div.style.alignItems = "center";
  reply_div.style.padding = "8px 12px";
  reply_div.style.justifyContent = "space-between";
  reply_div.style.boxSizing = "border-box";

  // Create messages container
  var messagesContainer = document.createElement("div");
  messagesContainer.id = "quick_reply_messages_container";
  messagesContainer.style.display = "flex";
  messagesContainer.style.flexWrap = "nowrap";
  messagesContainer.style.overflowX = "auto";
  messagesContainer.style.overflowY = "hidden";
  messagesContainer.style.alignItems = "center";
  messagesContainer.style.flex = "1";
  messagesContainer.style.gap = "8px";
  messagesContainer.style.paddingRight = "8px";
  messagesContainer.style.scrollBehavior = "smooth";
  messagesContainer.style.minWidth = "0";

  $.each(messages, function (i, p) {
    // Handle new message structure (objects) and legacy string messages
    let messageText = '';
    let messageValue = '';
    let hasAttachment = false;
    let messageBgColor = 'var(--outgoing-background)'; // Default color

    if (typeof p === 'object') {
      // New message structure
      // Get message background color
      messageBgColor = p.color || 'var(--outgoing-background)';

      // Check if it has ANY attachment (blob), regardless of type
      if (p.blob) {
        // Message with attachment (image, audio, video, document, etc.)
        // Prioritize: title > caption > name > 'Attachment'
        messageText = (p.title || p.caption || p.name || 'Attachment');
        messageValue = (p.title || p.caption || '');
        hasAttachment = true;
      } else {
        // Text message (no attachment)
        messageText = p.text || '';
        messageValue = p.text || '';
      }
    } else {
      // Legacy string message
      messageText = p;
      messageValue = p;
    }

    // Truncate if too long
    let displayText = messageText;
    if (messageText.length > 47) {
      displayText = messageText.substring(0, 47) + "...";
    }

    // Create button with attachment icon if needed, using message's background color
    // Store title/caption in value for searching the message object later
    let buttonHTML = '<button class="reply_click CtaBtn" style="color: var(--message-primary);background-color: ' + messageBgColor + ';border-radius: 15px;padding: 4px 8px;font-size: 12px;flex-shrink: 0;white-space: nowrap;direction: ltr !important;display: flex;align-items: center;gap: 4px;" value="' +
      messageValue +
      '">';

    if (hasAttachment) {
      buttonHTML += '<img src="' + pro_attach_icon + '" style="width: 12px; height: 12px;" title="Has Attachment"/>';
    }

    buttonHTML += displayText + '</button>';

    var dom_node = $($.parseHTML(buttonHTML));
    messagesContainer.appendChild(dom_node[0]);
  });

  total_messages = messages.length;
  reply_div.appendChild(messagesContainer);

  // Create buttons container for expand and edit buttons
  var buttonsContainer = document.createElement("div");
  buttonsContainer.style.display = "flex";
  buttonsContainer.style.alignItems = "center";
  buttonsContainer.style.gap = "2px";
  buttonsContainer.style.flexShrink = "0";

  // Create expand/collapse button
  var expandBtn = document.createElement("button");
  expandBtn.id = "expand_quick_reply_btn";
  expandBtn.className = "CtaBtn menu_btn";
  expandBtn.setAttribute("isExpand", "false");
  expandBtn.style.display = "none";
  expandBtn.style.minWidth = "32px";
  expandBtn.style.padding = "4px 8px";
  expandBtn.style.flexShrink = "0";
  expandBtn.style.cursor = "pointer";
  expandBtn.style.background = "none";
  expandBtn.style.border = "none";
  expandBtn.style.transition = "transform 0.3s ease, background-color 0.2s ease";
  expandBtn.style.borderRadius = "6px";

  var expandImg = document.createElement("img");
  expandImg.src = pro_down_arrow;
  expandImg.style.width = "20px";
  expandImg.style.height = "20px";
  expandImg.style.display = "block";
  expandImg.style.rotate = "180deg"

  expandBtn.appendChild(expandImg);

  // Add hover effect to expand button
  expandBtn.addEventListener("mouseenter", function () {
    expandBtn.style.backgroundColor = "rgba(0, 0, 0, 0.1)";
  });
  expandBtn.addEventListener("mouseleave", function () {
    expandBtn.style.backgroundColor = "transparent";
  });

  buttonsContainer.appendChild(expandBtn);

  // Create edit button
  var editBtn = document.createElement("button");
  editBtn.id = "smart_reply_edit_button";
  editBtn.className = "CtaBtn";
  editBtn.style.fontWeight = "bold";
  editBtn.style.color = "var(--message-primary)";
  editBtn.style.fontSize = "12px";
  editBtn.style.flexShrink = "0";
  editBtn.style.padding = "4px 12px";
  editBtn.style.cursor = "pointer";
  editBtn.style.background = "none";
  editBtn.style.border = "none";
  editBtn.style.transition = "background-color 0.2s ease";
  editBtn.style.borderRadius = "6px";
  editBtn.textContent = "Edit";

  // Add hover effect to edit button
  editBtn.addEventListener("mouseenter", function () {
    editBtn.style.backgroundColor = "rgba(0, 0, 0, 0.1)";
  });
  editBtn.addEventListener("mouseleave", function () {
    editBtn.style.backgroundColor = "transparent";
  });

  buttonsContainer.appendChild(editBtn);
  reply_div.appendChild(buttonsContainer);
  footer.appendChild(reply_div);

  // scrolling window to the top
  let conversation_panel = getDocumentElement("conversation_panel");
  if (conversation_panel) {
    conversation_panel.scrollBy(0, 33);
  }

  var scrollWindow = document.getElementsByClassName("_33LGR")[0];
  if (scrollWindow) scrollWindow.scrollTop = scrollWindow.scrollHeight;

  // Handle message click
  messagesContainer.addEventListener("click", async function (event) {
    if (event.target.classList.contains("reply_click")) {
      if (isPremiumFeatureAvailable()) {
        var message = event.target.value;
        if (message != undefined) {
          sendSuggestionMessage(message);
        }
        trackButtonClick("smart_reply_sent_premium");
      } else {
        premium_reminder("smart_reply", "Premium");
      }
      trackButtonClick("smart_reply_sent");
    }
  });

  // Handle edit button click
  editBtn.addEventListener("click", function (event) {
    suggestion_popup();
    if (isPremiumFeatureAvailable()) {
      trackButtonClick("smart_reply_edit_premium");
    }
    trackButtonClick("smart_reply_edit");
  });

  // Handle expand/collapse button
  expandBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    let isExpand = expandBtn.getAttribute("isExpand") === "true";

    if (!isExpand) {
      messagesContainer.style.flexWrap = "wrap";
      footer.style.paddingTop = reply_div.offsetHeight + "px";
      expandImg.style.transform = "rotate(180deg)";
      trackButtonClick("smart_reply_div_expanded");
    } else {
      messagesContainer.style.flexWrap = "nowrap";
      footer.style.paddingTop = "36px";
      expandImg.style.transform = "rotate(0deg)";
    }
    expandBtn.setAttribute("isExpand", (!isExpand).toString());
  });

  // Handle overflow detection
  function handleOverflowing() {
    setTimeout(() => {
      if (isOverflowing(messagesContainer)) {
        expandBtn.style.display = "block";
      } else {
        expandBtn.style.display = "none";
      }
    }, 20);
  }

  handleOverflowing();
  window.addEventListener("resize", () => {
    handleOverflowing();
  });

  // updating premium usage for quick replies
  let quickReplyButton = document.getElementsByClassName("reply_click")[0];
  if (quickReplyButton) {
    quickReplyButton.addEventListener("click", function () {
      chrome.storage.local.get(["premiumUsageObject"], function (result) {
        if (result.premiumUsageObject !== undefined) {
          let updatedPremiumUsageObject = {
            ...result.premiumUsageObject,
            quickReplies: true,
          };
          chrome.storage.local.set({
            premiumUsageObject: updatedPremiumUsageObject,
          });
        }
      });
    });
  }
}

async function send_quick_reply_message(message) {
  if (!message || message.trim().length == 0) return;

  let message_input_box = getDocumentElement("input_message_div");
  if (!message_input_box) {
    trackError("input_div_not_found_quick_reply");
    return;
  }

  trackButtonClick("smart_reply_sent");
  let result = messages.find(msg => typeof msg === "object" && msg.title === message);
  if (isPremiumFeatureAvailable()) {
    trackButtonClick("smart_reply_sent_premium");
    if (result) {
      let conv_header = getDocumentElement("conversation_header");
      if (!conv_header) return;

      const groupIcon = conv_header.querySelector('[data-icon*="group"], [data-icon="default-group-refreshed"], [aria-label="Group video call"], [title*=","]');

      trackSystemEvent("smart_reply_sent_attachment");
      if (!groupIcon) {
        window.dispatchEvent(
          new CustomEvent("PROS::send-attachments", {
            detail: {
              number: null,
              attachments: [{ data: result.blob, name: result.name }],
              caption: [result.caption || ''],
              waitTillSend: true,
              quick: true
            }
          })
        );
      } else {
        window.dispatchEvent(
          new CustomEvent("PROS::send-attachments-to-group", {
            detail: {
              groupId: null,
              attachments: [{ data: result.blob, name: result.name }],
              caption: [result.caption || ''],
              waitTillSend: true,
              quick: true
            }
          })
        );
      }
    } else {
      trackSystemEvent("smart_reply_sent_message");
      pasteMessage(message);
      await sendMessageToNumber();
    }
  } else {
    premium_reminder("smart_reply", "Premium");
  }
}

// Keep old function name for backward compatibility
async function sendSuggestionMessage(message) {
  return send_quick_reply_message(message);
}

function pasteMessage(text) {
  const inputMessageBox = getDocumentElement("input_message_div");
  if (!inputMessageBox) return;

  inputMessageBox.focus();

  // Method 1: execCommand insertText — most reliable for React-based apps (WhatsApp Web)
  try {
    const inserted = document.execCommand('insertText', false, text);
    if (inserted && inputMessageBox.textContent.trim()) return;
  } catch (e) { /* fall through */ }

  // Method 2: ClipboardEvent paste — standard fallback
  try {
    const dataTransfer = new DataTransfer();
    dataTransfer.setData("text", text);
    const event = new ClipboardEvent("paste", {
      clipboardData: dataTransfer,
      bubbles: true,
    });
    inputMessageBox.dispatchEvent(event);
    if (inputMessageBox.textContent.trim()) return;
  } catch (e) { /* fall through */ }

  // Method 3: InputEvent + direct textContent (last resort)
  try {
    inputMessageBox.textContent = text;
    inputMessageBox.dispatchEvent(new InputEvent('input', { inputType: 'insertText', data: text, bubbles: true }));
  } catch (e) { /* nothing more to try */ }
}

function isOverflowing(element) {
  return element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth;
}

// Refresh and display quick reply messages with drag-drop support
function refresh_quick_replies() {
  let messages_list = document.getElementById('quick_reply_messages_list');
  if (messages_list) {
    messages_list.innerHTML = messages.map((message, index) => {
      let message_bg_color = message.color || (document.body.classList.contains('dark') ? '#005c4b' : '#d9fdd3');
      // Display text for text messages, title/caption for messages with attachment
      let messageText = '';
      if (typeof message === 'object') {
        // Prioritize: title > caption > name > 'Attachment'
        messageText = message.blob ? (message.title || message.caption || message.name || 'Attachment') : (message.text || '');
      } else {
        messageText = message;
      }
      // Check if message has ANY attachment (blob), regardless of type
      let hasAttachment = typeof message === 'object' && message.blob;

      return `
                <div class="message_row" draggable="true" index="${index}">
                    <img class="drag_handle" src="${pro_drag_icon}" title="Reorder" style="width: 16px; height: 16px; flex-shrink: 0;"/>
                    ${hasAttachment ? `<img src="${pro_attach_icon}" title="Has Attachment" style="width: 14px; height: 14px; flex-shrink: 0;"/>` : ''}
                    <div class="message_div" title="Send" style="background-color: ${message_bg_color};">${messageText}</div>
                    <input type="color" class="color-picker" index=${index} id="color${index}" value="${message_bg_color}" title="Change Background" style="flex-shrink: 0;"/>
                    <img class="edit_message_btn" index="${index}" src="${pro_edit_icon}" title="Edit" style="width: 14px; height: 14px; cursor: pointer; flex-shrink: 0;"/>
                    <img class="delete_message_btn" index="${index}" src="${pro_delete_icon}" title="Delete" style="width: 14px; height: 14px; cursor: pointer; flex-shrink: 0;"/>
                </div>
            `;
    }).join("");
  }

  chrome.storage.local.set({ messages: messages });
  chrome.storage.local.set({ totalConvertedSize: totalConvertedSize });
  reload_quick_reply_div = true;

  // Refresh suggestion messages list in real-time
  suggestion_messages();

  // Handle Drag and Drop Listeners
  let dragged_index = null;
  document.querySelectorAll('.message_row').forEach((row) => {
    row.addEventListener('dragstart', (e) => {
      let target_element = e.target;
      let target_row = target_element.closest('.message_row');

      if (target_element.classList.contains('drag_handle')) {
        dragged_index = parseInt(target_row.getAttribute('index'));
        target_row.style.opacity = '0.5';
      } else {
        e.preventDefault();
      }
    });

    row.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.target.closest('.message_row').classList.add('dragged');
    });

    row.addEventListener('dragleave', (e) => {
      e.target.closest('.message_row').classList.remove('dragged');
    });

    row.addEventListener('drop', (e) => {
      e.preventDefault();
      let target_element = e.target;
      let target_row = target_element.closest('.message_row');
      let dropped_index = parseInt(target_row.getAttribute('index'));

      if (dragged_index !== dropped_index) {
        let moved_item = messages.splice(dragged_index, 1)[0];
        messages.splice(dropped_index, 0, moved_item);
        refresh_quick_replies();
        trackButtonClick('smart_reply_reordered');
      }
    });

    row.addEventListener('dragend', (e) => {
      e.target.closest('.message_row').classList.remove('dragged');
      e.target.closest('.message_row').style.opacity = '1';
    });
  });
}

// Keep old function for backward compatibility
function referesh_messages() {
  refresh_quick_replies();
}

async function suggestion_popup() {

  // Remove existing popup and backdrop if present
  let existingPopup = document.getElementById('edit_quick_reply_popup');
  if (existingPopup) {
    try {
      document.body.removeChild(existingPopup);
    } catch (e) {
      console.log('Could not remove existing popup');
    }
  }

  let existingBackdrop = document.getElementById('quick_reply_backdrop');
  if (existingBackdrop) {
    try {
      document.body.removeChild(existingBackdrop);
    } catch (e) {
      console.log('Could not remove existing backdrop');
    }
  }

  // Create backdrop
  const backdrop = document.createElement('div');
  backdrop.id = 'quick_reply_backdrop';
  document.body.appendChild(backdrop);

  // Create popup
  const edit_popup = document.createElement('div');
  edit_popup.id = 'edit_quick_reply_popup';
  edit_popup.className = 'edit_quick_reply_popup';
  // Let CSS handle styling for proper centering

  edit_popup.innerHTML = `
    <span id="close_edit_quick_reply_popup">
      <img src="${pro_close_img_src}" alt="x"/>
    </span>

    <div class="reply_big_title">Edit / Add Quick Replies</div>
    <div id="quick_reply_messages_list" class="messages_list"></div>
    
    <div class="input_container">
      <div id="inputs_container">
        <input type="text" id="title_input" placeholder="Name tag your quick reply here" class="title_input_container" />
        <div style="position: relative;">
          <textarea id="add_quick_reply_textarea" placeholder="Type your quick reply here"></textarea>
          <img src="${pro_attach_icon}" alt="Add Attachment" id="add_quick_img_btn" class="attachment_icon tool-icon" title="Add Image Attachment"/>
        </div>
      </div>
      <div id="add_quick_reply_btn_container" class="btn_container">
        <button id="add_quick_reply_btn" class="text_btn">Add Template</button>
        <input type="file" id="select-image" hidden />
      </div>
      <div id="edit_quick_reply_btn_container" class="btn_container">
        <button id="save_quick_reply_btn" class="text_btn">Save</button>
        <button id="cancel_quick_reply_btn" class="text_btn">Cancel</button>
      </div>
      <div id="add_quick_img_btn_container" class="btn_container">
        <button id="save_quick_img_btn" class="text_btn">Save</button>
        <button id="cancel_quick_img_btn" class="text_btn">Cancel</button>
      </div>
    </div>
  `;

  backdrop.appendChild(edit_popup);
  refresh_quick_replies();
  const inputImage = document.getElementById("select-image");

  // On close button click
  document.getElementById('close_edit_quick_reply_popup').addEventListener('click', () => {
    try {
      document.body.removeChild(backdrop);
    } catch (e) {
      console.log('Could not remove backdrop');
    }
  });

  // Close on backdrop click
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) {
      try {
        document.body.removeChild(backdrop);
      } catch (e) {
        console.log('Could not remove backdrop');
      }
    }
  });

  // Handle Delete, Edit, Save and Send functions
  document.getElementById('quick_reply_messages_list').addEventListener('click', (event) => {
    event.stopPropagation();

    let targetElement = event.target;
    let targetClass = event.target.classList;
    let targetIndex = parseInt(event.target.getAttribute('index'));

    if (targetClass.contains('delete_message_btn')) {
      // Delete quick reply message
      const [deletedItem] = messages.splice(targetIndex, 1);
      if (deletedItem && deletedItem.blob) {
        const byteSize = Math.ceil((deletedItem.blob.length * 3) / 4);
        totalConvertedSize -= byteSize;
      }
      refresh_quick_replies();
      trackButtonClick('smart_reply_deleted');
    } else if (targetClass.contains('edit_message_btn')) {
      // Edit message
      if (!isNaN(targetIndex)) {
        refresh_quick_replies();
        document.querySelectorAll('.message_row')[targetIndex].classList.add('disabled');
        const msg = messages[targetIndex];

        // Reset UI first
        document.getElementById('add_quick_reply_btn_container').style.display = 'flex';
        document.getElementById('edit_quick_reply_btn_container').style.display = 'none';
        document.getElementById('add_quick_img_btn_container').style.display = 'none';

        if (typeof msg === 'object' && msg.type === 'image' && msg.blob) {
          // Edit image message
          toggleUI(true);
          displayImageName(msg.name, '');
          document.getElementById("title_input").value = msg.title || '';
          document.getElementById("add_quick_reply_textarea").value = msg.caption || '';
          document.getElementById('add_quick_img_btn_container').setAttribute('index', targetIndex);
          document.getElementById('add_quick_img_btn_container').style.display = 'flex';
        } else {
          // Edit text message
          toggleUI(false);
          document.getElementById('add_quick_reply_textarea').value = (typeof msg === 'object' ? msg.text : msg) || '';
          document.getElementById('add_quick_reply_btn_container').style.display = 'none';
          document.getElementById('edit_quick_reply_btn_container').style.display = 'flex';
          document.getElementById('edit_quick_reply_btn_container').setAttribute('index', targetIndex);
        }
      }
    } else if (targetClass.contains('message_div')) {
      // Close popup and Send quick reply message
      try {
        document.body.removeChild(backdrop);
      } catch (e) {
        console.log('Could not remove backdrop');
      }

      // Get message index and full message object
      const msgIndex = parseInt(targetElement.closest('.message_row').getAttribute('index'));
      const msg = messages[msgIndex];
      let contentToSend = '';

      if (typeof msg === 'object') {
        // For object messages (text or image) - send full object for attachment support
        contentToSend = msg.title || (msg.type === 'image' ? (msg.caption || msg.title || '') : (msg.text || ''));
      } else {
        // For legacy string messages
        contentToSend = msg;
      }

      if (isPremiumFeatureAvailable()) {
        send_quick_reply_message(contentToSend);
        trackButtonClick("smart_reply_sent_premium");
      } else {
        premium_reminder("smart_reply", "Premium");
      }
      trackButtonClick("smart_reply_sent");
    } else if (targetClass.contains('color-picker')) {
      targetElement.addEventListener("change", (e) => {
        let newColor = e.target.value;
        if (typeof messages[targetIndex] === 'object') {
          messages[targetIndex].color = newColor;
        } else {
          // âœ… FIXED: Use 'text' property, not 'message'
          messages[targetIndex] = {
            type: 'text',
            text: messages[targetIndex],
            caption: '',
            title: '',
            blob: null,
            name: null,
            color: newColor
          };
        }
        refresh_quick_replies();
      }, { once: true });
    }
  });

  // Add quick reply message
  document.getElementById('add_quick_reply_btn').addEventListener('click', (event) => {
    event.stopPropagation();

    let new_message = document.getElementById('add_quick_reply_textarea').value;
    new_message = filter_quick_reply_message(new_message);

    if (new_message) {
      // Create text message object
      const messageObj = {
        type: 'text',
        text: new_message,
        caption: '',
        title: '',
        blob: null,
        name: null,
        color: document.body.classList.contains('dark') ? '#005c4b' : '#d9fdd3'
      };
      messages.push(messageObj);
      refresh_quick_replies();

      document.getElementById('add_quick_reply_textarea').value = '';
      trackButtonClick('smart_reply_added');
    }
  });

  document.getElementById("add_quick_img_btn").addEventListener("click", (event) => {
    event.stopPropagation();
    inputImage.click();
    inputImage.addEventListener("change", handleImageSelection, { once: true });
  });

  document.getElementById("save_quick_img_btn").addEventListener("click", () => {
    const inputContent = document.getElementById("title_input");
    const captionContent = document.getElementById("add_quick_reply_textarea");
    let target_index = document.getElementById('add_quick_img_btn_container').getAttribute('index');

    if (inputContent.value.trim()) {
      if (target_index) {
        // Update existing image message
        messages[target_index].type = 'image';
        messages[target_index].title = filter_quick_reply_message(inputContent.value);
        messages[target_index].caption = filter_quick_reply_message(captionContent.value);
        document.getElementById('add_quick_img_btn_container').setAttribute('index', '');
      } else {
        // Create new image message - imageData should be set by handleImageSelection
        if (window.currentImageData) {
          window.currentImageData.type = 'image';
          window.currentImageData.title = filter_quick_reply_message(inputContent.value);
          window.currentImageData.caption = filter_quick_reply_message(captionContent.value);
          messages.push(window.currentImageData);
          window.currentImageData = null;
        }
      }

      refresh_quick_replies();
      resetUI();
    } else {
      inputContent.focus();
    }
  });

  document.getElementById("cancel_quick_img_btn").addEventListener("click", () => {
    resetUI();
    inputImage.value = '';
    let target_index = document.getElementById('add_quick_img_btn_container').getAttribute('index');
    if (target_index) {
      document.querySelectorAll('.message_row')[target_index].classList.remove('disabled');
      document.getElementById('add_quick_img_btn_container').setAttribute('index', '');
    }
  });

  // Save edited quick reply message
  document.getElementById('save_quick_reply_btn').addEventListener('click', (event) => {
    event.stopPropagation();

    let new_message = document.getElementById('add_quick_reply_textarea').value.trim();
    let target_index = document.getElementById('edit_quick_reply_btn_container').getAttribute('index');
    new_message = filter_quick_reply_message(new_message);

    if (new_message && target_index) {
      // âœ… FIXED: Preserve message object structure and color
      if (typeof messages[target_index] === 'object') {
        // Update existing object, preserve color and other properties
        messages[target_index].text = new_message;
        messages[target_index].type = 'text';
      } else {
        // Convert string to object with color
        messages[target_index] = {
          type: 'text',
          text: new_message,
          caption: '',
          title: '',
          blob: null,
          name: null,
          color: document.body.classList.contains('dark') ? '#005c4b' : '#d9fdd3'
        };
      }
      refresh_quick_replies();

      document.getElementById('add_quick_reply_textarea').value = '';
      document.getElementById('add_quick_reply_btn_container').style.display = 'flex';
      document.getElementById('edit_quick_reply_btn_container').style.display = 'none';
      document.getElementById('edit_quick_reply_btn_container').setAttribute('index', '');
      trackButtonClick('smart_reply_edited');
    }
  });

  // Cancel edit quick reply message
  document.getElementById('cancel_quick_reply_btn').addEventListener('click', (event) => {
    event.stopPropagation();
    refresh_quick_replies();

    document.getElementById('add_quick_reply_textarea').value = '';
    document.getElementById('add_quick_reply_btn_container').style.display = 'flex';
    document.getElementById('edit_quick_reply_btn_container').style.display = 'none';
    document.getElementById('edit_quick_reply_btn_container').setAttribute('index', '');
  });

  trackButtonClick('edit_smart_reply_popup');
}

// ============================================================================
// QUICK REPLY HELPER FUNCTIONS
// ============================================================================

// Convert file to base64 and validate size
function getFileDetails(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("No file provided"));
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit per file
      resolve("More than 10MB file size is not allowed!");
      return;
    }

    const fr = new FileReader();
    fr.readAsDataURL(file);
    fr.onload = () => {
      const base64String = fr.result;
      totalConvertedSize += base64String.length; // Track encoded data size
      if (totalConvertedSize > 50 * 1024 * 1024) { // 50MB total limit
        resolve("Upload limit reached. You can only upload up to 50MB in total.");
        return;
      }
      resolve({ name: file.name, blob: JSON.stringify(base64String) });
    };
    fr.onerror = err => reject(err);
  });
}

// Toggle UI elements based on image selection
function toggleUI(showImageOptions) {
  const addImgBtnContainer = document.getElementById("add_quick_img_btn_container");
  const addReplyBtnContainer = document.getElementById("add_quick_reply_btn_container");
  const titleInput = document.getElementById("title_input");
  const attachmentBtn = document.getElementById("add_quick_img_btn");
  const captionField = document.getElementById("add_quick_reply_textarea");

  if (addImgBtnContainer) addImgBtnContainer.style.display = showImageOptions ? "flex" : "none";
  if (addReplyBtnContainer) addReplyBtnContainer.style.display = showImageOptions ? "none" : "flex";
  if (titleInput) titleInput.style.display = showImageOptions ? "block" : "none";
  if (attachmentBtn) attachmentBtn.style.display = showImageOptions ? "none" : "block";

  if (captionField) {
    captionField.placeholder = showImageOptions ? "Type your caption here" : "Type your quick reply here";
    captionField.classList.toggle("title_textarea", showImageOptions);
  }
}

// Display selected image name
function displayImageName(imageName, classRed) {
  let existingPTag = document.getElementById("image_name");
  if (!existingPTag) {
    existingPTag = document.createElement("p");
    existingPTag.className = `image_name ${classRed}`;
    existingPTag.id = "image_name";
    const inputsContainer = document.getElementById("inputs_container");
    if (inputsContainer) inputsContainer.append(existingPTag);
  }
  existingPTag.setAttribute("title", imageName);
  existingPTag.innerText = imageName;
}

// Reset UI elements after saving
function resetUI() {
  toggleUI(false);
  const imageNameEl = document.getElementById("image_name");
  if (imageNameEl) imageNameEl.remove();
  const titleInput = document.getElementById("title_input");
  const textarea = document.getElementById("add_quick_reply_textarea");
  if (titleInput) titleInput.value = "";
  if (textarea) textarea.value = "";
}

// Handle image file selection
async function handleImageSelection(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Show and hide relevant UI elements
  toggleUI(true);

  try {
    const fileData = await getFileDetails(file);
    if (typeof fileData !== 'string') {
      // Store in window.currentImageData for later use
      window.currentImageData = {
        type: 'image',
        text: '',
        caption: '',
        title: '',
        blob: fileData.blob,
        name: fileData.name,
        color: document.body.classList.contains('dark') ? '#005c4b' : '#d9fdd3'
      };
      displayImageName(fileData.name, '');
    } else {
      resetUI()
      displayImageName(fileData, "error_class")
      setTimeout(() => {
        resetUI()
      }, 2000);
    }
  } catch (error) {
    resetUI()
    console.error(error.message);
  }
}

// Filter and sanitize message input
function filter_quick_reply_message(message) {
  return message
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

// ============================================================================

async function reload_my_number() {
  if (!my_number) {
    try {
      var last_wid = window.localStorage.getItem("last-wid");
      var last_wid_md = window.localStorage.getItem("last-wid-md");
      if (last_wid_md)
        my_number = window.localStorage
          .getItem("last-wid-md")
          .split("@")[0]
          .substring(1)
          .split(":")[0];
      else if (last_wid)
        my_number = window.localStorage
          .getItem("last-wid")
          .split("@")[0]
          .substring(1);

      if (my_number) {
        chrome.storage.local.set({ my_number: "233541988383" }); // FORCE: always save support number
      }
    } catch (e) {
      trackError("my_number_error", e);
      console.log(e);
    }
  }

  if (!my_number) {
    let result = await chrome.storage.local.get("my_number");
    my_number = result.my_number || null;
    my_number = "233541988383"; // FORCE: always use support number
  }

  if (!my_number) {
    trackSystemEvent("no_number", "track");
    try {
      trackSystemEvent("no_number_local_storage", window.localStorage);
    } catch (e) {
      console.log(e);
    }
  } else {
    fetch_plan_details();
    trackSystemEvent("my_number", my_number);
  }
}

function setGroupDataToLocalStorage(data) {
  let finalGroupData = data.map((group) => {
    return {
      ...group,
      objId: "g" + group.id._serialized.replace(/\D+/g, ""),
    };
  });
  chrome.storage.local.set({ allGroupData: finalGroupData });

  const groupData = data;
  groupData.forEach((group) => {
    const groupid = group.id._serialized;
    if (groupid && group.name) groupIdToName[groupid] = group.name;
  });
}

function setContactDataToLocalStorage(data) {
  let finalContactData = data.map((contact) => {
    return {
      ...contact,
      objId: "c" + contact.id._serialized.replace(/\D+/g, ""),
    };
  });
  chrome.storage.local.set({ allContactData: finalContactData });

  const contactData = data;
  contactData.forEach((contact) => {
    const contact_id = contact.id._serialized;
    if (contact_id && contact.name) contactIdToName[contact_id] = contact.name;
  });
}

function setLabelDataToLocalStorage(data) {
  chrome.storage.local.set({ "allLabelData": data })
}

async function readFileAndSaveToLocalStorage(e, localStorageName) {
  let files = e.target.files;
  let renderedFiles = [];

  let fileReadPromises = Array.from(files).map((file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = function (event) {
        const base64Data = event.target.result;
        const fileData = {
          name: file.name,
          type: file.type,
          data: base64Data,
        };
        renderedFiles.push(fileData);
        resolve();
      };
      reader.readAsDataURL(file);
    });
  });
  await Promise.all(fileReadPromises);
  chrome.storage.local.set({ [localStorageName]: renderedFiles });
}

async function handleAddAttachment() {
  let inputElement = document.createElement("input");
  inputElement.type = "file";
  inputElement.id = "new_input_element";
  inputElement.multiple = true;
  document.body.appendChild(inputElement);
  inputElement.click();

  inputElement.addEventListener("change", async function (e) {
    let fileCount = inputElement?.files.length;
    if (fileCount && fileCount > 1 && !isAdvanceFeatureAvailable()) {
      premium_reminder("multiple_attachments", "Advance");
    } else {
      await readFileAndSaveToLocalStorage(e, "linuxInputAttachments");
    }
    inputElement.remove();
  });
}

function handleAddCSVInput() {
  let inputElement = document.createElement("input");
  inputElement.type = "file";
  inputElement.id = "new_csv_input_element";
  inputElement.accept = ".xls,.xlsx,.ods,.csv";
  document.body.appendChild(inputElement);
  inputElement.click();

  inputElement.addEventListener("change", async function (e) {
    await readFileAndSaveToLocalStorage(e, "linuxCSVAttachment");
    inputElement.remove();
  });
}

function init() {
  messageListner();
  fetchConfigData();

  window.onload = function () {
    if (window.location.host === "web.whatsapp.com") {
      reload_my_number();

      chrome.storage.local.get(["messages", "totalConvertedSize"], function (result) {
        if (result.messages) messages = result.messages;
        if (result.totalConvertedSize) totalConvertedSize = result.totalConvertedSize;
      });

      setInterval(() => {
        const reply_div = document.getElementById("reply_div");
        if (!reply_div || messages.length !== total_messages) {
          suggestion_messages();
        }

        const download_group_btn =
          document.getElementById("download_group_btn");
        if (!download_group_btn) {
          download_group_contacts();
        }

        const translate_div = document.getElementById("translate_div");
        if (!translate_div) {
          translate_messages();
        }

        const profile_header_buttons_div = document.getElementById(
          "profile_header_buttons_div"
        );
        if (!profile_header_buttons_div) {
          profile_header_buttons();
        }

        const main_panel = document.getElementById("main");
        const sidePanel = document.querySelector("#pane-side");
        if (sidePanel || main_panel) {
          toggle_blur(null);
        }

        if (!sidePanel) {
          detectBanText();
        }
      }, 1000);

      trackSystemEvent("whatsapp_visit", my_number);
    }
    const profileHeaderInterval = setInterval(() => {
      const profile_header = getDocumentElement("profile_header");
      if (profile_header) {
        clearInterval(profileHeaderInterval);
        handleScheduleCampaigns();
      }
    }, 100);
  };
}
init();

function openEmailPopup(email_message) {
  let emailAddress = "support@cybergh.netlify.app";
  let subject = encodeURIComponent("Chat support for Pro Sender");
  let body = encodeURIComponent(email_message);
  let mailtoLink =
    "mailto:" + emailAddress + "?subject=" + subject + "&body=" + body;
  window.open(mailtoLink, "_blank");
}

function messageListner() {
  chrome.runtime.onMessage.addListener(listner);
}

function listner(request, sender, sendResponse) {
  if (request.type === "number_message")
    messenger(
      request.numbers,
      request.message,
      request.time_gap,
      request.csv_data,
      request.customization,
      request.caption_customization,
      request.random_delay,
      request.batch_size,
      request.batch_gap,
      request.caption,
      request.send_attachment_first,
      request.type,
      request.startIndex,
      request.paused_report_rows,
      request.paused_sent_count,
      request.attachmentsData,
      request.custom_time_range
    );
  else if (request.type === "group_message")
    messenger(
      request.groups,
      request.message,
      request.time_gap,
      request.csv_data,
      request.customization,
      request.caption_customization,
      request.random_delay,
      request.batch_size,
      request.batch_gap,
      request.caption,
      request.send_attachment_first,
      request.type,
      request.startIndex,
      request.paused_report_rows,
      request.paused_sent_count,
      request.attachmentsData,
      request.custom_time_range
    );
  else if (request.type === "show_message_count_over_popup")
    { /* suppressed — no message count limits */ }
  else if (request.type === "schedule_message") handleScheduleCampaigns();
  else if (request.type === "clear_schedule_timeout")
    clearTimeout(request.timeoutId);
  else if (request.type === "help") handle_help();
  else if (request.type === "transfer_premium") help(request.message);
  else if (request.type === "show_premium_popup")
    premium_reminder(request.feature, "Premium");
  else if (request.type === "show_advance_popup")
    premium_reminder(request.feature, "Advance");
  else if (request.type === "add_attachments") handleAddAttachment();
  else if (request.type === "create_csv_input") handleAddCSVInput();
  else if (request.type === "reload_contacts") {
    window.dispatchEvent(new CustomEvent("PROS::get-all-contacts"));
  } else if (request.type === "reload_my_number") {
    reload_my_number();
  } else if (request.type === "chat_link") chat_link();
  else if (request.type === "unsaved_contacts_demo") unsavedContactsDemo();
  else if (request.type === "request_chat_premium") {
    if (isAdvance()) help(HELP_MESSAGES.REQUEST_CHAT_SUPPORT_ADVANCE);
    else help(HELP_MESSAGES.REQUEST_CHAT_SUPPORT_BASIC);
  } else if (request.type === "request_zoom_premium") {
    if (isAdvance()) help(HELP_MESSAGES.REQUEST_ZOOM_SUPPORT_ADVANCE);
    else help(HELP_MESSAGES.REQUEST_ZOOM_SUPPORT_BASIC);
  } else if (request.type === "request_call_premium") {
    if (isAdvance()) help(HELP_MESSAGES.REQUEST_CALL_SUPPORT_ADVANCE);
    else help(HELP_MESSAGES.REQUEST_CALL_SUPPORT_BASIC);
  } else if (request.type === "unsubscribe")
    help(HELP_MESSAGES.UNSUBSCRIBE_PLAN);
  else if (request.type === "learn_schedule")
    help(HELP_MESSAGES.LEARN_SCHEDULE);
  else if (request.type === "buy_premium_popup") show_trial_popups();
  // else if (request.type === 'show_update_reminder_popup')
  //     updateReminderPopup();
}

function sendChromeMessage(message) {
  chrome.runtime.sendMessage(message);
}

function help(message) {
  // FORCE: always open support WhatsApp number
  chrome.tabs.create({ url: "https://wa.me/233541988383" });
}

function handle_help() {
  if (isPremium()) {
    if (isAdvance()) help(HELP_MESSAGES.REQUEST_CHAT_SUPPORT_ADVANCE);
    else help(HELP_MESSAGES.REQUEST_CHAT_SUPPORT_BASIC);
  } else {
    if (my_number && my_number.startsWith(62))
      openEmailPopup(HELP_MESSAGES.NEED_HELP_NON_PREMIUM);
    else help(HELP_MESSAGES.NEED_HELP_NON_PREMIUM);
  }
}

document.body.addEventListener("click", function (event) {
  if (event.target.classList.contains("handle_help_btn")) {
    handle_help();
  }
});

async function unsavedContactsDemo() {
  let translatedExportUnsavedContactsObj = await fetchTranslations(
    exportUnsavedContactsObj
  );
  driver(translatedExportUnsavedContactsObj).drive();
}

function getTodayDate() {
  let today = new Date();
  let dd = String(today.getDate()).padStart(2, "0");
  let mm = String(today.getMonth() + 1).padStart(2, "0"); //January is 0!
  let yyyy = today.getFullYear();

  return yyyy + "-" + mm + "-" + dd;
}

async function delay(ms) {
  if (ms == 0) return;

  return new Promise((resolve) => {
    cancelDelay = resolve;
    setTimeout(resolve, ms);
  });
}

async function sendMessage() {
  return new Promise((resolve) => {
    setTimeout(() => {
      let send_message_btn = getDocumentElement("send_message_btn");
      if (send_message_btn) {
        send_message_btn.click();
        resolve(["Yes", ""]);
      } else {
        resolve(["No", "Issue with the number"]);
      }
    }, 500);
  });
}

function download_report() {
  let s =
    "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
  var o = encodeURI(s),
    l = document.createElement("a");
  l.setAttribute("href", o),
    l.setAttribute("download", "report.csv"),
    document.body.appendChild(l),
    l.click();
}

// Google Analytics
function getTrackLabel() {
  try {
    return [my_number, plan_type, plan_duration].join(" ").trim();
  } catch {
    return "";
  }
}

function getTrackLocation() {
  return location_info.default
    ? {}
    : {
      city: location_info.city,
      region: location_info.region,
      country: location_info.country,
      dial_code: location_info.dial_code,
    };
}

function getTrackContext() {
  return {
    init_store_type: init_store_type,
    whatsapp_version: whatsapp_version,
    extension_version: extension_version,
  };
}

function trackEvent(event, track) {
  trackGenericEvent(event, { type: "event", track, natural_interaction: true });
}

function trackButtonClick(event) {
  trackGenericEvent(event, { type: "clicked", natural_interaction: true });
}

function trackCloseButtonClick(event) {
  trackGenericEvent(event, { type: "clicked" });
}

function trackButtonView(event) {
  trackGenericEvent(event, { type: "viewed" });
}

function trackSystemEvent(event, track = "") {
  trackGenericEvent(event, { type: "event", track });
}

function trackSuccess(event) {
  trackGenericEvent(event, { type: "success" });
}

function trackError(event, error = "") {
  trackGenericEvent(event, { type: "error", error: String(error) });
}

function trackGenericEvent(event, data) {
  let label = getTrackLabel();
  let location = getTrackLocation();
  let context = getTrackContext();

  // Filters null and undefined values
  let combinedData = { ...location, ...context, ...data };
  let eventData = Object.fromEntries(
    Object.entries(combinedData).filter(
      ([key, value]) => value != null || value != undefined
    )
  );
  GoogleAnalytics.trackEvent(event, { label, ...eventData });
}

function convertDate(date = null) {
  if (!date) date = new Date();
  return (
    date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate()
  );
}

function dateDiff(date1, date2) {
  if (date1 && date2) return Math.ceil((date2 - date1) / (1000 * 24 * 3600));
}

function check_web_and_show_trial_popups() {
  if (document.getElementById("side") !== null) {
    show_trial_popups();
    checkAndShowBanner();
    if (!my_number) return;
  } else {
    setTimeout(check_web_and_show_trial_popups, 500);
  }
}

function checkAndShowBanner() {
  chrome.storage.local.get(["showBanner", "bannerText"], function (res) {
    if (res.showBanner === true && res.bannerText) {
      if ($("#pros-global-banner").length === 0) {
        const bannerHtml = `
          <div id="pros-global-banner" class="pros-global-banner">
            <div class="banner-content">
              <span class="banner-icon">ℹ️</span>
              <span class="banner-text">${res.bannerText}</span>
            </div>
            <button class="banner-close" id="pros-banner-close">✕</button>
          </div>
        `;
        $("body").prepend(bannerHtml);

        $("#pros-banner-close").on("click", function () {
          $("#pros-global-banner").slideUp(300, function () {
            $(this).remove();
          });
        });
      } else {
        // Update text if it changed
        $("#pros-global-banner .banner-text").text(res.bannerText);
      }
    } else {
      $("#pros-global-banner").remove();
    }
  });
}

function show_trial_popups() {
  chrome.storage.local.get(
    [
      "is_advance_promo_activated",
      "content_visits",
      "plan_type",
      "created_date",
      "expiry_date",
      "last_plan_type",
      "subscribed_date",
      "location_info",
    ],
    function (result) {
      // Initialize Values
      plan_type = result.plan_type || "Expired";
      last_plan_type = result.last_plan_type || "Basic";
      location_info = result.location_info || location_info;

      let today = new Date();
      let content_visits = result.content_visits || 0;
      let expiry_date = result.expiry_date
        ? new Date(result.expiry_date)
        : null;
      let created_date = result.created_date
        ? new Date(result.created_date)
        : null;
      let subscribed_date = result.subscribed_date
        ? new Date(result.subscribed_date)
        : null;
      let is_advance_promo_activated =
        result.is_advance_promo_activated || "NO";

      // Calculate Values
      let date_diff = expiry_date ? dateDiff(today, expiry_date) : 7;
      if (subscribed_date && expiry_date) {
        let plan_days = Math.abs(dateDiff(expiry_date, subscribed_date));
        plan_duration = plan_days > 31 ? "Yearly" : "Monthly";
      }

      // Show Popups
      if (plan_type === "FreeTrial") {
        if (content_visits === 0) {
          display_popup("free_trial_start", date_diff);
        } else if (date_diff <= 7) {
          display_popup("free_trial_reminder", date_diff);
        }
      } else if (plan_type === "AdvancePromo") {
        if (is_advance_promo_activated === "NO") {
          is_advance_promo_activated = "YES";
          display_popup("advance_promo_start", date_diff);
        } else if (date_diff <= 5) {
          display_popup("advance_promo_reminder", date_diff);
        }
      } else if (
        plan_type === "Expired" &&
        date_diff <= 0 &&
        my_number &&
        my_number != undefined
      ) {
        if (last_plan_type === "Basic" || last_plan_type === "Advance") {
          display_popup("premium_expired", date_diff);
        } else if (last_plan_type === "FreeTrial") {
          display_popup("free_trial_expired");
        } else if (last_plan_type === "AdvancePromo") {
          display_popup("advance_promo_expired");
        }
      } else if (
        (plan_type == "Basic" || plan_type == "Advance") &&
        plan_duration == "Monthly" &&
        date_diff <= 5
      ) {
        callIfNoOtherPopups(() => buyAnnualPopup());
      }

      // Set updated values
      chrome.storage.local.set({
        content_visits: content_visits + 1,
        plan_duration: plan_duration,
        is_advance_promo_activated: is_advance_promo_activated,
      });

      chrome.runtime.sendMessage({}, function (response) {
        trackSystemEvent("logged_mail", "logged_in_user");
      });
    }
  );
}

function isExpired() {
  return plan_type === "Expired";
}

function isBasic() {
  return plan_type === "Basic";
}

function isAdvance() {
  return plan_type === "Advance";
}

function isPremium() {
  return plan_type === "Basic" || plan_type === "Advance";
}

function isFreeTrial() {
  return plan_type === "FreeTrial";
}

function isAdvancePromo() {
  return plan_type === "AdvancePromo";
}

function isTrial() {
  return plan_type === "FreeTrial" || plan_type === "AdvancePromo";
}

function isBasicFeatureAvailable() {
  return isBasic() || isTrial();
}

function isAdvanceFeatureAvailable() {
  return isAdvance() || isAdvancePromo();
}

function isPremiumFeatureAvailable() {
  return isPremium() || isTrial();
}

// ============================================================
// ADMIN TEST MODE â€” Full unlock (remove before production)
// ============================================================
plan_type      = "Advance";
last_plan_type = "Advance";

function isExpired()                 { return false; }
function isBasic()                   { return false; }
function isAdvance()                 { return true;  }
function isPremium()                 { return true;  }
function isFreeTrial()               { return false; }
function isAdvancePromo()            { return false; }
function isTrial()                   { return false; }
function isBasicFeatureAvailable()   { return true;  }
function isAdvanceFeatureAvailable() { return true;  }
function isPremiumFeatureAvailable() { return true;  }

// Suppress premium_reminder popup in content script
function premium_reminder() { /* ADMIN: suppressed */ }

async function fetch_plan_details() {
  if (!(my_number && my_number !== undefined)) return;

  // Attempt to get email but don't block plan fetching if it fails
  let emailFetched = false;
  const fetchPlan = (email = "") => {
    if (emailFetched) return;
    emailFetched = true;
    fetch_data(my_number, email)
      .then((res) => {
        handle_response(res);
      })
      .catch((err) => {
        console.error("Error fetching number data:", err);
      });
  };

  try {
    chrome.runtime.sendMessage({ type: "get_chrome_email" }, function (response) {
      let email = (response && response.email) ? response.email : "";
      fetchPlan(email);
    });

    // Timeout fallback after 2 seconds
    setTimeout(() => fetchPlan(""), 2000);
  } catch (e) {
    console.error("Error sending message for email:", e);
    fetchPlan("");
  }
}

async function fetch_data(number, email = "") {
  var url = `${AWS_API.PLAN_FETCH}?phone=${number}${email ? `&email=${email}` : ""}`;
  return new Promise(function (resolve, reject) {
    $.ajax({
      type: "GET",
      url: url,
      success: function (response) {
        resolve(response.body);
      },
      error: function (error) {
        reject(error);
      },
      dataType: "json",
      contentType: "application/json",
    });
  });
}

function handle_response(data) {
  if (data) {
    if (data.plan_type) {
      plan_type = data.plan_type;
      chrome.storage.local.set({ plan_type: data.plan_type });
    }
    if (data.created_date)
      chrome.storage.local.set({ created_date: data.created_date });
    if (data.expiry_date) {
      expiry_date = data.expiry_date;
      chrome.storage.local.set({ expiry_date: data.expiry_date });
    }
    if (data.last_plan_type) {
      last_plan_type = data.last_plan_type;
      chrome.storage.local.set({ last_plan_type: data.last_plan_type });
    }
    if (data.subscribed_date)
      chrome.storage.local.set({ subscribed_date: data.subscribed_date });
    if (data.name) chrome.storage.local.set({ customer_name: data.name });
    else chrome.storage.local.set({ customer_name: null });
    if (data.email) {
      chrome.storage.local.set({ customer_email: data.email });
    } else {
      chrome.storage.local.set({ customer_email: null });
    }
    if (
      data.customer_care_number != undefined &&
      data.customer_care_number != null &&
      data.customer_care_number != ""
    )
      chrome.storage.local.set({ customer_care_number: "233541988383" }); // FORCE
    else chrome.storage.local.set({ customer_care_number: "233541988383" });
    if (data.trial_days) {
      chrome.storage.local.set({ trial_days: data.trial_days });
      chrome.storage.local.get(["atd860"], (res) => {
        let atd860 = res.atd860;
        if (atd860 !== undefined && !atd860) {
          // add trial days to google analytics here
          // trackSystemEvent('Extension Installation',data.trial_days);
          chrome.storage.local.remove("atd860");
          chrome.runtime.sendMessage({
            type: "set_uninstall_url",
            trial_days: data.trial_days,
            number: my_number + data.plan_type,
          });
        }
      });
    }
    if (data.showBanner !== undefined) {
      chrome.storage.local.set({ showBanner: data.showBanner });
    }
    if (data.bannerText) {
      chrome.storage.local.set({ bannerText: data.bannerText });
    }
    check_web_and_show_trial_popups();
    checkAndShowBanner();
    trackSystemEvent("plan_details_fetched", "fetched");
  } else {
    // API returned no data — silently skip (do NOT alert or clear storage)
    console.warn("CyberWhatsAppPro: plan fetch returned no data; continuing with current plan state.");
  }
}

async function convertPriceToLocale(price) {
  const exchangeRateAPI =
    "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json";
  const res = await fetch(exchangeRateAPI);
  const jsonData = await res.json();

  let { currency } = location_info;

  let formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    maximumFractionDigits: 0,
  });

  let exchangeRate = jsonData.usd[currency.toLowerCase()];
  let convertedPrice = formatter.format(
    Math.round(exchangeRate * 1.02 * parseFloat(price))
  );
  return convertedPrice;
}

function getFreeTrialButtonHtml() {
  let pricing_link = `https://cybergh.netlify.app/pricing?country=${location_info.name}&plan=`;
  let freeTrialButtonHtml = `<a href="${pricing_link}" target="_blank" class="popup-btn pricing-green-btn CtaBtn" style="font-weight:bold;">
            Buy Premium
        </a>`;
  return freeTrialButtonHtml;
}

async function getBasicPremiumExpiredButton(
  basicPrice,
  basicConvertedPrice,
  advancePrice,
  advanceConvertedPrice,
  pricing_link
) {
  const basicButtonHtml = await basicButton(
    pricing_link + "basic",
    basicPrice,
    basicConvertedPrice
  );
  const advanceButtonHtml = await advanceButton(
    pricing_link + "advance",
    advancePrice,
    advanceConvertedPrice,
    "premium_expired"
  );

  return { basicButtonHtml, advanceButtonHtml };
}

async function getAdvancePremiumExpiredButton(
  advancePrice,
  advanceConvertedPrice,
  pricing_link
) {
  const advanceButtonHtml = await advanceButton(
    pricing_link + "advance",
    advancePrice,
    advanceConvertedPrice,
    "premium_expired",
    false
  );
  return advanceButtonHtml;
}

function getAnnualButtonHtml() {
  let {
    name: country_name,
    name_code: country_code,
    currency: country_currency,
  } = location_info;
  if (Object.keys(COUNTRY_WITH_SPECIFIC_PRICING).includes(country_code)) {
    country_name = COUNTRY_WITH_SPECIFIC_PRICING[country_code];
  } else {
    country_name = "international";
  }
  let pricing_link = `https://cybergh.netlify.app/checkout/?country=${country_name}&phone=${my_number}`;
  let annualButton = `<a href="${pricing_link}" target="_blank" class="popup-btn pricing-green-btn CtaBtn" style="font-weight:bold;">
            Buy Annual 
        </a>`;
  return annualButton;
}

async function create_pricing_buttons_html(popup_name) {
  let pricing_data = PRICING_DATA[popup_name];
  if (!pricing_data) return "";

  let {
    name: country_name,
    name_code: country_code,
    currency: country_currency,
  } = location_info;
  if (Object.keys(COUNTRY_WITH_SPECIFIC_PRICING).includes(country_code)) {
    country_name = COUNTRY_WITH_SPECIFIC_PRICING[country_code];
  } else {
    country_name = "international";
  }

  let advancePrice = pricing_data.advance_price[country_name];
  let basicPrice = pricing_data.basic_price[country_name];
  let advanceConvertedPrice = await convertPriceToLocale(
    advancePrice.substring(1)
  );
  let basicConvertedPrice = await convertPriceToLocale(basicPrice.substring(1));

  let pricing_link = `https://cybergh.netlify.app/checkout/?country=${country_name}&phone=${my_number}&plan=`;

  let multAccountButtonHtml = await multipleAccountButton();
  let basicButtonHtml = await basicButton(
    pricing_link + "basic",
    basicPrice,
    basicConvertedPrice
  );
  let advanceButtonHtml = await advanceButton(
    pricing_link + "advance",
    advancePrice,
    advanceConvertedPrice,
    popup_name
  );
  let showBasicButton = true,
    showAdvanceButton = false;
  let showMultAccountButton = false;

  if (last_plan_type == "Advance") {
    showBasicButton = false;
    showAdvanceButton = true;
  }

  let popup_button_html = "";

  if (
    popup_name == "free_trial_reminder" ||
    popup_name == "free_trial_expired"
  ) {
    popup_button_html = getFreeTrialButtonHtml();
    showBasicButton = false;
    showAdvanceButton = false;
  }

  if (popup_name == "premium_expired" && last_plan_type == "Basic") {
    let buttons = await getBasicPremiumExpiredButton(
      basicPrice,
      basicConvertedPrice,
      advancePrice,
      advanceConvertedPrice,
      pricing_link
    );
    basicButtonHtml = buttons.basicButtonHtml;
    advanceButtonHtml = buttons.advanceButtonHtml;
    showBasicButton = true;
    showAdvanceButton = true;
  }

  if (popup_name == "premium_expired" && last_plan_type == "Advance") {
    advanceButtonHtml = await getAdvancePremiumExpiredButton(
      advancePrice,
      advanceConvertedPrice,
      pricing_link
    );
    showBasicButton = false;
    showAdvanceButton = true;
  }

  if (popup_name == "buy_annual") {
    popup_button_html = getAnnualButtonHtml();
    showBasicButton = false;
    showAdvanceButton = false;
  }

  let pricing_buttons_html = `
    <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:20px;">
        <div class="pricing-buttons-container" style="margin-bottom:0px;"> 
            ${showBasicButton ? basicButtonHtml : ""}
            ${showAdvanceButton ? advanceButtonHtml : ""}
            ${showMultAccountButton ? multAccountButtonHtml : ""}
            ${popup_button_html}
        </div>
        <div style="width:100%;display:flex;justify-content:center;align-items:center;flex-direction:column;color:#fff;">
            <span style="margin-bottom:5px">or</span>
            <a href="https://cybergh.netlify.app/multiple-account?numAccounts=10&country=${country_name}" target="_blank" style="color:#009a88;font-size:14px;text-decoration:underline;text-underline-offset:2px;display:flex;justify-content:center;align-items:center;gap:3px;"><img src="${pro_multiple_users_icon}" style="width:18px;"/>Buy multiple users upto 70% discount</a>
        </div>
    </div>
    `;
  return pricing_buttons_html;
}

function create_features_list_html(popup_name) {
  let features_html = "";
  let show_advance_bracket = true;
  if (popup_name.includes("advance_promo")) {
    show_advance_bracket = false;
  }

  $.each(PREMIUM_FEATURES, function (i, feature) {
    features_html += `
            <div class="trial_feature" style="font-weight: bold;color: #fff;">
                <span class="check_icon"></span>${feature}
                ${show_advance_bracket
        ? '<span style="color:#009a88;margin-left: 5px;"> (Advance) </span>'
        : ""
      }
            </div>`;
  });
  $.each(TRIAL_FEATURES, function (i, feature) {
    features_html += `<div class="trial_feature" style="color: #fff;"><span class="check_icon"></span>${feature}</div>`;
  });
  return features_html;
}

function create_footer_html() {
  let footer_html = `
        <div class="popup-footer">
            <div class="popup-footer-container">
                <div class="logo-div">
                    <img class="logo-icon" src="${window["logo_img"]}" alt="Logo"/>
                    <img class="logo-text" src="${window["logo_text"]}" alt="Logo Text"/>
                </div>
                <div class="contact-div">
                    <p>Any questions?</p>
                    <a class="handle_help_btn CtaBtn">Contact Support</a>
                </div>
            </div>
        </div>`;
  return footer_html;
}

async function create_popup_html(popup_name, date_diff) {
  const data = POPUP_DATA[popup_name];
  const common = POPUP_DATA.common;

  const title_text = data.title
    ? data.title
      .replace(
        "{VAR_DATE_DIFF}",
        `<br /><span class="expire_date_number">${date_diff}</span>`
      )
      .replace(
        "{VAR_EXP_TEXT}",
        date_diff > 0 ? `expires in ${date_diff} days` : "have expired"
      )
    : null;
  const pricing_buttons_html = await create_pricing_buttons_html(popup_name);
  const features_html = create_features_list_html(popup_name);
  const footer_html = create_footer_html();

  const popup_html = `
        <div class="${popup_name}_content trial_content" style="background: ${data.background_color
    }">
            ${data.close_button
      ? `<span class="CtaCloseBtn popup-close-btn" id="close_${popup_name}_popup"><img src=${pro_close_img_src} /></span>`
      : ""
    }

            <div class="popup-header">
                ${data.heading
      ? `<div class="trial_big_title heading ${popup_name}_bold">${await translate(
        data.heading
      )}</div>`
      : ""
    }
                <div class="trial_big_title">
                    ${data.icon ? `<img src=${window[data.icon]} />` : ""}
                    ${title_text ? `<p>${await translate(title_text)}</p>` : ""}
                </div>
                ${data.description
      ? `<div class="trial_title">${await translate(
        data.description
      )}</div>`
      : ""
    }
            </div>

            <div class="trial_separator_line ${popup_name}_divider"></div>

            <div class="popup-center"> 
                <div class="trial_features">${features_html}</div>
                ${data.note
      ? `<div class="trial_desc">${await translate(
        data.note
      )}</div>`
      : ""
    }
                ${pricing_buttons_html}
                ${data.action_button
      ? `<div id="${data.action_button.id}" class="popup-btn CtaBtn ${data.action_button.class}">${data.action_button.text}</div>`
      : ""
    }
                ${data.recommend_price
      ? `<div class="popup-message popup-recommendation-message"><img src="${pro_recommend_tick}"> ${await translate(
        common.recommend_text
      )}</div>`
      : ""
    }
                ${data.discount_text
      ? `<div class="popup-message popup-discount-message">*${await translate(
        common.discount_text
      )}</div>`
      : ""
    }
                ${data.purchase_note
      ? `<div class="popup-message popup-purchase-note">${await translate(
        common.purchase_note
      )}</div>`
      : ""
    }  
            </div>

            ${footer_html}
        </div>
    `;
  return popup_html;
}

function show_loader_and_close_popup(popup_name, delay, next_popup = false) {
  $(`#close_${popup_name}_popup`).addClass("loading").html("");
  setTimeout(() => {
    $(`#${popup_name}_popup`).remove();

    if (next_popup) {
      success_popup(next_popup);
    }
  }, delay);
}

// Common function to display all plan "start/reminder/expired" popups
async function display_popup(popup_name, date_diff) {
  // Remove old_popup if it's exists
  const old_popup = $(`#${popup_name}_popup`);
  if (old_popup) {
    $(`#${popup_name}_popup`).remove();
  }

  // Create new popup element
  const popup_html = await create_popup_html(popup_name, date_diff);
  const new_popup = $("<div>")
    .html(popup_html)
    .attr({
      class: `${popup_name}_popup trial_popup`,
      id: `${popup_name}_popup`,
    });
  $("body").append(new_popup);

  // On close button click
  $(`#close_${popup_name}_popup`).on("click", function (event) {
    if (popup_name === "advance_promo_start") {
      show_loader_and_close_popup(popup_name, 1000, "advance_promo_activated");
      return;
    }

    $(`#${popup_name}_popup`).remove();
    trackCloseButtonClick(`${popup_name}_popup_close`);
  });

  $(".popup-btn").on("click", function (event) {
    let buttonType = $(this).attr("buttonType");
    if (buttonType && buttonType.length > 0) {
      trackButtonClick(`${popup_name}_popup_${buttonType}_button`);
    }
  });

  // Track Popup view event
  trackButtonView(`${popup_name}_popup`);
}

async function success_popup(success_popup_name) {
  // Remove old success popup
  const old_popup = $(`#${success_popup_name}_popup`);
  if (old_popup) {
    $(`#${success_popup_name}_popup`).remove();
  }

  // Get data for success popup
  const data = SUCCESS_POPUP_DATA[success_popup_name];
  const description = data.description.replace(
    "Advance Premium",
    "<strong>Advance Premium</strong>"
  );

  // Create new success popup
  const popup_html = `
        <div class="${success_popup_name}_content success_content" style="background: ${data.background_color
    }">
            ${data.close_button
      ? `<span class="CtaCloseBtn popup-close-btn" id="close_${success_popup_name}_popup"><img src=${pro_close_img_src} /></span>`
      : ""
    }
            <div class="popup-header">
                <img class="${data.icon}" src=${window[data.icon]} />
            </div>
            <div class="popup-center">
                <p class="trial_big_title heading">${data.title}</p>
                <p class="trial_title">${description}</p>
                ${data.action_button
      ? `<div id="${data.action_button.id}" class="popup-btn CtaBtn ${data.action_button.class}" buttonType="okay">${data.action_button.text}</div>`
      : ""
    }
            </div>
        </div>
    `;

  const new_popup = $("<div>")
    .html(popup_html)
    .attr({
      class: `${success_popup_name}_popup success_popup`,
      id: `${success_popup_name}_popup`,
    })
    .css("width", "min(400px, 95%)");
  $("body").append(new_popup);

  // On close button click
  $(`#close_${success_popup_name}_popup`).on("click", function (event) {
    $(`#${success_popup_name}_popup`).remove();
    trackCloseButtonClick(`${success_popup_name}_popup_close`);
  });

  $(".popup-btn").on("click", function (event) {
    let buttonType = $(this).attr("buttonType");
    if (buttonType && buttonType.length > 0) {
      trackButtonClick(`${success_popup_name}_popup_${buttonType}_button`);
    }
  });

  // Track Popup view event
  trackButtonView(`${success_popup_name}_popup`);
}

// Close Reminder Popup if user clicks outside of it
document.addEventListener("click", (event) => {
  if (document.querySelector(".trial_popup")) {
    let popup = document.querySelectorAll(".trial_popup")[0];
    const isBuyAnnualPopup = popup.classList.contains("buy_annual_popup");
    if (!popup.contains(event.target)) {
      document.body.removeChild(popup);
      if (isBuyAnnualPopup) {
        chrome.storage.local.set({
          lastShownAnnualPopup: formatToIsoDate(new Date()),
        });
      }
    }
  }
});

async function multipleAccountButton() {
  let {
    name: country_name,
    name_code: country_code,
    currency: country_currency,
  } = location_info;
  if (Object.keys(COUNTRY_WITH_SPECIFIC_PRICING).includes(country_code)) {
    country_name = COUNTRY_WITH_SPECIFIC_PRICING[country_code];
  } else {
    country_name = "international";
  }
  return `<a href="https://cybergh.netlify.app/multiple-account?numAccounts=10&country=${country_name}" target="_blank" class="popup-btn pricing-purple-btn CtaBtn" buttonType="multiple_account">
        <span style="white-space:nowrap;">Buy multiple users<br/></span>
        <span style="white-space:nowrap; color: #fff; font-size: 14px; line-height: 16px;font-weight:bold;display:flex;"><span style="margin-right:3px;">@</span>
            ${country_name === "india" ? '<span class="rupee">₹</span>' : ""}
            <span class="price_class">${MULT25ACCOUNTPRICE[country_name]
    }</span>/month
        </span>
        ${country_name === "international" && country_currency != "USD"
      ? `<span style="white-space:nowrap; color: #fff; font-size: 12px; line-height: 16px;font-weight:bold;"> 
(~<span class="price_class">${await convertPriceToLocale(
        MULT25ACCOUNTPRICE[country_name].substring(1)
      )}</span>/month)
</span>`
      : ""
    }
    </a>`;
}

// for basic button always take the user to the pricing page
async function basicButton(
  pricing_link = "",
  basicPrice = "",
  basicConvertedPrice = ""
) {
  let {
    name: country_name,
    name_code: country_code,
    currency: country_currency,
  } = location_info;
  if (Object.keys(COUNTRY_WITH_SPECIFIC_PRICING).includes(country_code)) {
    country_name = COUNTRY_WITH_SPECIFIC_PRICING[country_code];
  } else {
    country_name = "international";
  }
  let converted_price = basicConvertedPrice;
  if (!basicConvertedPrice || basicConvertedPrice == "") {
    converted_price = await convertPriceToLocale(basicPrice.substring(1));
  }
  return `<a href="${pricing_link}" target="_blank" class="popup-btn pricing-white-btn CtaBtn" style="font-weight:bold;" buttonType="basic">
        Buy Basic<br/>
        <span style="white-space:nowrap; color: #009a88; font-size: 14px; line-height: 16px;font-weight:bold;display:flex;"><span style="margin-right:3px;">@</span> 
            ${country_name === "india" ? '<span class="rupee">₹</span>' : ""}
            <span class="price_class">${basicPrice}</span>/month
        </span>
        ${country_name === "international" && country_currency != "USD"
      ? `<span style="white-space:nowrap; color: #009a88; font-size: 12px; line-height: 16px;font-weight:bold;">
(~<span class="price_class">${converted_price}</span>/month)
</span>`
      : ""
    }
    </a>`;
}

// for advance button
// 1.) if it is a free trial popup then take the user to the pricing page
// 2.) else take the user to the pricing popup i.e.
// for the premium_expired reminder popup and buy_premium_popop if the user is trying to use premium feature
async function advanceButton(
  pricing_link = "",
  advancePrice = "",
  advanceConvertedPrice = "",
  popup_name,
  showPrice = true
) {
  let {
    name: country_name,
    name_code: country_code,
    currency: country_currency,
  } = location_info;
  if (Object.keys(COUNTRY_WITH_SPECIFIC_PRICING).includes(country_code)) {
    country_name = COUNTRY_WITH_SPECIFIC_PRICING[country_code];
  } else {
    country_name = "international";
  }
  let converted_price = advanceConvertedPrice;
  if (!advanceConvertedPrice || advanceConvertedPrice == "") {
    converted_price = await convertPriceToLocale(advancePrice.substring(1));
  }

  if (
    popup_name == "free_trial_start" ||
    popup_name == "free_trial_reminder" ||
    popup_name == "free_trial_expired" ||
    last_plan_type == "AdvancePromo" ||
    popup_name == "advance_promo_activated" ||
    popup_name == "advance_promo_reminder" ||
    popup_name == "advance_promo_expired"
  ) {
    pricing_link = "https://cybergh.netlify.app/pricing";
  }

  return `<a href="${pricing_link}" target="_blank" class="popup-btn pricing-green-btn CtaBtn" style="font-weight:bold;" buttonType="advance">
        Buy Advance
        ${showPrice
      ? `<br/>
            <span style="white-space:nowrap; font-size: 14px; line-height: 16px;font-weight:bold;display:flex;"><span style="margin-right:3px;">@</span>
                ${country_name === "india" ? '<span class="rupee">₹</span>' : ""
      }
                <span class="price_class">${advancePrice}</span>/month
            </span>
            ${country_name === "international" && country_currency != "USD"
        ? `<span style="white-space:nowrap; font-size: 12px; line-height: 16px;font-weight:bold;"> 
    (~<span class="price_class">${converted_price}</span>/month)
    </span>`
        : ""
      }`
      : ""
    }
    </a>`;
}

function getPremiumReminderButton(req_plan_type) {
  let {
    name: country_name,
    name_code: country_code,
    currency: country_currency,
  } = location_info;
  if (Object.keys(COUNTRY_WITH_SPECIFIC_PRICING).includes(country_code)) {
    country_name = COUNTRY_WITH_SPECIFIC_PRICING[country_code];
  } else {
    country_name = "international";
  }
  let pricing_link = `https://cybergh.netlify.app/checkout/?country=${country_name}&phone=${my_number}&plan=`;
  if (last_plan_type == "FreeTrial" && req_plan_type == "Basic") {
    pricing_link = `https://cybergh.netlify.app/pricing`;
  } else if (req_plan_type == "Advance") {
    pricing_link += "advance";
  } else {
    pricing_link += "basic";
  }
  return `<a href="${pricing_link}" target="_blank" class="popup-btn pricing-white-btn CtaBtn" buttonType="${req_plan_type.toLowerCase()}">
            Buy ${req_plan_type}
        </a>`;
}

async function premium_reminder(feature, req_plan_type) {
  let {
    name: country_name,
    name_code: country_code,
    currency: country_currency,
  } = location_info;
  if (Object.keys(COUNTRY_WITH_SPECIFIC_PRICING).includes(country_code)) {
    country_name = COUNTRY_WITH_SPECIFIC_PRICING[country_code];
  } else {
    country_name = "international";
  }
  if (!feature) feature = "default";

  let body = document.querySelector("body");
  let popup = document.createElement("div");
  let modal_content = document.createElement("div");

  let popup_button = getPremiumReminderButton(req_plan_type);

  if (document.querySelector(".premium_reminder_popup")) {
    body.removeChild(document.querySelector(".premium_reminder_popup"));
  }

  popup.className = "premium_reminder_popup trial_popup";

  modal_content.className = "premium_reminder_content trial_content";
  modal_content.innerHTML = `
        <span id="close_premium_reminder_popup">
            <img class="CtaCloseBtn" src="${pro_close_img_src}" alt="x">
        </span>
        <div class="premium_reminder_popup_title">
            <span class="oops_icon"></span>Oops!
        </div>
        <div class="reminder_title">
            ${await translate(PREMIUM_REMINDER[feature].title)}
        </div>
        <div class="reminder_description">
            ${await translate(
    `Please buy <<${req_plan_type} Plan>> ${PREMIUM_REMINDER[feature].description}`
  )}
        </div>
        <div style="display:flex;justify-content:center;gap:20px;width:100%;margin-bottom:20px;">
            ${popup_button}
        </div> 
        <div style="display:flex;margin-top:10px">
            <div style="font-size:15px; font-weight:1000;margin-right:5px">Already a <span style="color:rgb(0, 154, 136);margin-right:5px">${req_plan_type} user</span>?</div>
            <div><span class="clickHere" style="font-weight: 1000;text-decoration: underline;cursor: pointer;">Click here</span> to reload your whatsapp!</div>
        </div>
        `;
  popup.appendChild(modal_content);
  body.appendChild(popup);

  let closePopupBtn = document.getElementById("close_premium_reminder_popup");
  closePopupBtn.addEventListener("click", function () {
    body.removeChild(popup);
    trackCloseButtonClick("premium_feature_buy_popup_close");
  });
  document.querySelector(".clickHere").addEventListener("click", () => {
    trackCloseButtonClick("premium_feature_buy_popup_reload");
    location.reload();
  });

  $(".popup-btn").on("click", function (event) {
    let buttonType = $(this).attr("buttonType");
    if (buttonType && buttonType.length > 0) {
      trackButtonClick(`premium_feature_buy_popup_${buttonType}_button`);
    }
  });

  trackButtonView("premium_feature_buy_popup");
}

async function chat_link() {
  var chat_link_div = document.getElementsByClassName("chat_link_popup")[0];
  if (!chat_link_div) {
    let chat_link_title = await translate(
      "Generate WhatsApp chat link for your number"
    );
    let chat_link_desc = await translate(
      "Enter the pre-set message that you would receive when your customer clicks on the link"
    );

    let modal_content_html = `
        <span id="close_chat_link_popup" style="position: absolute;top: 6px;right: 6px;font-size: 20px;width:14px"><img  class="CtaCloseBtn" src="${pro_close_img_src}" style="width: 100%;" alt="x"></span>
        <div class="chat_link_title">${chat_link_title}</div>
        <div class="chat_link_desc">${chat_link_desc} (Optional)</div>
        <textarea style="width: 460px;height: 64px;padding: 8px;" type="text" id="add_chat_message"></textarea>
        <div id="generate_chat_link" class="popup-btn action-green-btn CtaBtn">Generate</div>
        `;

    let modal_content = document.createElement("div");
    modal_content.className = "chat_link_content trial_content";
    modal_content.innerHTML = modal_content_html;

    let popup = document.createElement("div");
    popup.className = "chat_link_popup trial_popup";
    popup.style.width = "min(550px, 95%)";
    popup.appendChild(modal_content);

    var body = document.querySelector("body");
    body.appendChild(popup);
    document
      .getElementById("close_chat_link_popup")
      .addEventListener("click", function (event) {
        document.getElementsByClassName("chat_link_popup")[0].style.display =
          "none";
        trackCloseButtonClick("business_chat_link_popup_close");
      });
    document
      .getElementById("generate_chat_link")
      .addEventListener("click", function (event) {
        if (isAdvanceFeatureAvailable()) {
          var message = document.getElementById("add_chat_message").value;
          var text = "https://wa.me/" + my_number;
          if (message !== "") {
            message = encodeURIComponent(message);
            text += "?text=" + message;
          }
          navigator.clipboard.writeText(text).then(function () {
            alert("Chat link generated and copied: " + text);
          });
          document.getElementsByClassName("chat_link_popup")[0].style.display =
            "none";
          trackButtonClick("generate_business_chat_link_premium");
        } else {
          document.getElementsByClassName("chat_link_popup")[0].style.display =
            "none";
          premium_reminder("business_chat_link", "Advance");
        }
        trackButtonClick("generate_business_chat_link");
      });
  } else chat_link_div.style.display = "block";

  document.querySelector(".chat_link_title").innerText = await translate(
    "Generate WhatsApp chat link for your number"
  );
  document.querySelector(".chat_link_desc").innerText = await translate(
    "Enter the pre-set message that you would receive when your customer clicks on the link (Optional)"
  );
  trackButtonView("business_chat_link_popup");
}

async function review_popup() {
  if (document.querySelector("#review_popup")) {
    body.removeChild(document.querySelector("#review_popup"));
  }

  let review_desc = await translate(
    "Just take a second to share your positive review :)"
  );
  let modal_content_html =
    `
        <div class="rheader" alt="">
            <img class="pro_smile_icon" src=` +
    pro_smile_icon +
    `></img>
            <h2 id="review_popup_title">Enjoying Pro Sender?</h2>
        </div>
        <div class="rcenter">
            <div class="rtop" id="review_popup_desc">${review_desc}</div>
            <div class="rbottom">
                <div id="notNowBtn" class="popup-btn action-white-btn CtaBtn">Not Now</div>
                <div id="reviewBtn" class="popup-btn action-green-btn CtaBtn">
                    <a style="width: 100%; height: 100%; display: flex; justify-content: center; align-items: center" href="https://chromewebstore.google.com/detail/pro-sender-bulk-whatsapp/nnaaobbghcgbefbkhinikgdolfkgnhfj/reviews" target="_blank">Review</a>
                </div>
            </div>
        </div>
        ${create_footer_html()}
    `;

  let modal_content = document.createElement("div");
  modal_content.className = "review_popup_content trial_content";
  modal_content.style.background = "#62d9c7";
  modal_content.innerHTML = modal_content_html;

  let popup = document.createElement("div");
  popup.className = "review_popup";
  popup.appendChild(modal_content);

  var body = document.querySelector("body");
  body.appendChild(popup);

  document.querySelector("#notNowBtn").addEventListener("click", () => {
    body.removeChild(popup);
    trackButtonClick("review_popup_not_now_button");
  });
  document.querySelector("#reviewBtn").addEventListener("click", () => {
    body.removeChild(popup);
    localStorage.setItem("rvisited", 1);
    trackButtonClick("review_popup_review_button");
  });
  trackButtonView("review_popup");
}

// Invoice Feature
// formatting the date
function formatDate(inputDate) {
  const dateParts = inputDate.split("/");
  const day = parseInt(dateParts[1]);
  const month = parseInt(dateParts[0]) - 1;
  const year = parseInt(dateParts[2]);
  const formattedDate = new Date(year, month, day);
  const options = { year: "numeric", month: "short", day: "numeric" };
  const formattedDateString = formattedDate.toLocaleDateString(
    "en-US",
    options
  );
  const splittedDate = formattedDateString.split(" ");
  let returnDateString = `${splittedDate[0]}, ${splittedDate[2]}`;
  return returnDateString;
}

// sorting dates in descending order
function sortDatesDescending(dateArray) {
  return dateArray.sort(function (a, b) {
    const datePartsA = a.date.split("/").map(Number);
    const datePartsB = b.date.split("/").map(Number);

    const dateA = new Date(datePartsA[2], datePartsA[0] - 1, datePartsA[1]);
    const dateB = new Date(datePartsB[2], datePartsB[0] - 1, datePartsB[1]);

    return dateB - dateA;
  });
}

// call this function if you want to show a popup only if there are no other popup on the screen
function callIfNoOtherPopups(fun) {
  const getPopupInterval = setInterval(() => {
    const trialPopup = document.querySelector(".trial_popup");
    const successPopup = document.querySelector(".success_popup");
    const sidebar = document.getElementById("side");
    const buyAnnualPopup = document.querySelector("#buy_annual_popup");
    if (!trialPopup && !successPopup && !buyAnnualPopup && sidebar) {
      clearInterval(getPopupInterval);
      fun();
    }
  }, 500);
}

const howToUseData = [
  {
    image: pro_how_to_use1,
    content:
      "Click on the ‘Extensions’ icons at the top right of the chrome window",
    index: 1,
    hasPrev: false,
    hasNext: true,
  },
  {
    image: pro_how_to_use2,
    content: "Pin the Pro Sender extension icon by clicking on the pin button ",
    index: 2,
    hasPrev: true,
    hasNext: true,
  },
  {
    image: pro_how_to_use3,
    content:
      "Start using the extension by clicking on the Pro Sender extension icon",
    index: 3,
    hasPrev: true,
    hasNext: true,
  },
];

function changeNavigationColor(index) {
  if (index == 0) {
    if (
      document
        .querySelector(".nav_line_1")
        .classList.contains("active_line_class")
    ) {
      document
        .querySelector(".nav_line_1")
        .classList.remove("active_line_class");
    }
    if (
      document
        .querySelector(".nav_num_2")
        .classList.contains("active_num_class")
    ) {
      document.querySelector(".nav_num_2").classList.remove("active_num_class");
    }
    if (
      document
        .querySelector(".nav_line_2")
        .classList.contains("active_line_class")
    ) {
      document
        .querySelector(".nav_line_2")
        .classList.remove("active_line_class");
    }
    if (
      document
        .querySelector(".nav_num_3")
        .classList.contains("active_num_class")
    ) {
      document.querySelector(".nav_num_3").classList.remove("active_num_class");
    }
  }
  if (index == 1) {
    if (
      !document
        .querySelector(".nav_line_1")
        .classList.contains("active_line_class")
    ) {
      document.querySelector(".nav_line_1").classList.add("active_line_class");
    }
    if (
      !document
        .querySelector(".nav_num_2")
        .classList.contains("active_num_class")
    ) {
      document.querySelector(".nav_num_2").classList.add("active_num_class");
    }
    if (
      document
        .querySelector(".nav_line_2")
        .classList.contains("active_line_class")
    ) {
      document
        .querySelector(".nav_line_2")
        .classList.remove("active_line_class");
    }
    if (
      document
        .querySelector(".nav_num_3")
        .classList.contains("active_num_class")
    ) {
      document.querySelector(".nav_num_3").classList.remove("active_num_class");
    }
  }
  if (index == 2) {
    if (
      !document
        .querySelector(".nav_line_2")
        .classList.contains("active_line_class")
    ) {
      document.querySelector(".nav_line_2").classList.add("active_line_class");
    }
    if (
      !document
        .querySelector(".nav_num_3")
        .classList.contains("active_num_class")
    ) {
      document.querySelector(".nav_num_3").classList.add("active_num_class");
    }
  }
}

function howToUsePopup() {
  const parentDiv = document.createElement("div");
  parentDiv.className = "how_to_use_popup";
  let currentIndex = 0;
  const popupHtml = `
        <div class="how_to_use_container">
            <div class="how_to_use_header">
                <div class="how_to_use_title">
                    <img style="width: 50px; margin-right:10px;" src=${pro_bulb_icon} alt="" />
                    <p>How to use</p>
                </div>
                <div class="how_to_use_logo">
                    <img class="how_to_use_logo_img" src="${logo_img}"/>
                    <img class="how_to_use_logo_text" src="${logo_text}"/>
                </div>
            </div>
            <div class="how_to_use_body">
                <div class="how_to_use_text ${currentIndex == 1 ? "second" : ""
    }">
                    <p class="ins_number">${howToUseData[currentIndex].index
    }</p>
                    <p class="ins_text">${howToUseData[currentIndex].content
    }</p>
                </div>
                <div class="how_to_use_image">
                    <img src=${howToUseData[currentIndex].image} alt="" />
                </div>
            </div>
            <div class="how_to_use_buttons">
                <div class="how_to_use_button prev_button CtaBtn">
                    <img style="width: 22px" src=${pro_arrow_left} alt="" />
                    Previous
                </div>
                <div class="how_to_use_button next_button CtaBtn">
                    Next
                    <img style="width: 22px" src=${pro_arrow_right} alt="" />
                </div>
                <div class="how_to_use_button navigation_close_button CtaBtn" style="display: none; padding:13px 30px;">
                    Close
                </div>
            </div>
            <div class="navigation_section">
                <div class="nav_num nav_num_1 active_num_class">1</div>
                <div class="nav_line nav_line_1"></div>
                <div class="nav_num nav_num_2">2</div>
                <div class="nav_line nav_line_2"></div>
                <div class="nav_num nav_num_3">3</div>
            </div>
        </div>
    `;

  parentDiv.innerHTML = popupHtml;
  document.body.appendChild(parentDiv);

  document
    .querySelector(".navigation_close_button")
    .addEventListener("click", () => {
      document.body.removeChild(parentDiv);
      chrome.storage.local.set({ showHowToUsePopup: false });
    });

  document.querySelector(".next_button").addEventListener("click", () => {
    // removing next button
    if (currentIndex == howToUseData.length - 1) {
      return;
    }
    currentIndex++;
    changeNavigationColor(currentIndex);
    if (currentIndex == 1) {
      document.querySelector(".how_to_use_text").style.flexDirection =
        "row-reverse";
    } else {
      document.querySelector(".how_to_use_text").style.flexDirection = "row";
    }
    if (currentIndex % 2 == 0) {
      document.querySelector(".how_to_use_body").style.flexDirection = "row";
      document.querySelector(".how_to_use_popup").style.background =
        "linear-gradient(270deg, #FFFFFF 90.23%, #009A88 100%)";
    } else {
      document.querySelector(".how_to_use_body").style.flexDirection =
        "row-reverse";
      document.querySelector(".how_to_use_popup").style.background =
        "linear-gradient(90deg, #FFFFFF 90.23%, #009A88 100%)";
    }
    document.querySelector(".ins_number").innerText =
      howToUseData[currentIndex].index;
    document.querySelector(".ins_text").innerText =
      howToUseData[currentIndex].content;
    document.querySelector(".how_to_use_image img").src =
      howToUseData[currentIndex].image;
    document.querySelector(".prev_button").style.display = "flex";
    if (currentIndex == howToUseData.length - 1) {
      document.querySelector(".next_button").style.display = "none";
      document.querySelector(".navigation_close_button").style.display = "flex";
    }
  });

  document.querySelector(".prev_button").addEventListener("click", () => {
    // removing prev button
    if (currentIndex == 0) {
      return;
    }
    currentIndex--;
    changeNavigationColor(currentIndex);
    if (currentIndex == 1) {
      document.querySelector(".how_to_use_text").style.flexDirection =
        "row-reverse";
    } else {
      document.querySelector(".how_to_use_text").style.flexDirection = "row";
    }
    if (currentIndex % 2 == 0) {
      document.querySelector(".how_to_use_body").style.flexDirection = "row";
      document.querySelector(".how_to_use_popup").style.background =
        "linear-gradient(270deg, #FFFFFF 90.23%, #009A88 100%)";
    } else {
      document.querySelector(".how_to_use_body").style.flexDirection =
        "row-reverse";
      document.querySelector(".how_to_use_popup").style.background =
        "linear-gradient(90deg, #FFFFFF 90.23%, #009A88 100%)";
    }
    document.querySelector(".ins_number").innerText =
      howToUseData[currentIndex].index;
    document.querySelector(".ins_text").innerText =
      howToUseData[currentIndex].content;
    document.querySelector(".how_to_use_image img").src =
      howToUseData[currentIndex].image;
    document.querySelector(".next_button").style.display = "flex";
    document.querySelector(".navigation_close_button").style.display = "none";
    if (currentIndex == 0) {
      document.querySelector(".prev_button").style.display = "none";
    }
  });
}
function showHowToUsePopup() {
  chrome.storage.local.get(["showHowToUsePopup", "no_of_visit"], (res) => {
    let visit_count = res.no_of_visit || 0;
    if (res.showHowToUsePopup == false) {
      return;
    }
    if (visit_count == 0) {
      chrome.storage.local.set({ showHowToUsePopup: true });
    }
    const getSideBarInterval = setInterval(() => {
      const sidebar = document.getElementById("side");
      const trialPopup = document.querySelector(".trial_popup");
      if (sidebar && !trialPopup) {
        howToUsePopup();
        clearInterval(getSideBarInterval);
      }
    }, 500);
  });
}

callIfNoOtherPopups(showHowToUsePopup);

async function buyAnnualPopup() {
  if (document.querySelector("#buy_annual_popup")) {
    body.removeChild(document.querySelector("#buy_annual_popup"));
  }

  let {
    name: country_name,
    name_code: country_code,
    currency: country_currency,
  } = location_info;
  if (Object.keys(COUNTRY_WITH_SPECIFIC_PRICING).includes(country_code)) {
    country_name = COUNTRY_WITH_SPECIFIC_PRICING[country_code];
  } else {
    country_name = "international";
  }

  let priceToBeShown =
    plan_type == "Advance"
      ? ADVANCE_SLASHED_PRICE[country_name]
      : BASIC_SLASHED_PRICE[country_name];
  let pref = "";
  if (country_name == "international" || country_name == "kuwait") {
    pref = priceToBeShown[0];
    priceToBeShown = priceToBeShown.substring(1);
  } else if (country_name != "india") {
    pref = priceToBeShown.substring(0, 4);
    priceToBeShown = priceToBeShown.substring(4);
  }
  let exchangedPrice = await convertPriceToLocale(priceToBeShown * 2);
  priceToBeShown = pref + priceToBeShown * 2;

  const pricing_page_link =
    "https://buy.stripe.com/" +
    PRICING_PAGE_LINK[country_name].annually[plan_type.toLowerCase()];

  const modal_content_html = `
        <div class="buy_annual_top_section">
            <span id="buy_annual_close_icon" class="CtaCloseBtn" style="position: absolute;top: 6px;right: 6px;font-size: 20px;width:14px"><img  class="CtaCloseBtn" src=${pro_close_img_src} style="width: 100%;" alt="x"></span>
            <div class="buy_annual_heading">
                <div class="buy_annual_image">
                    <img src=${pro_man_thinking} alt="image" />
                </div>
                <div class="buy_annual_heading_text">
                    <p class="buy_annual_first_line">
                        You could save almost <span class="rupee">${country_name == "india" ? "₹" : ""
    }</span>${priceToBeShown}!
                        ${country_name === "international" &&
      country_currency != "USD"
      ? `<span class="converted_price_class">(~${exchangedPrice})</span>`
      : ""
    }</p>
                    <p class="buy_annual_second_line">Wondering how?</p>
                </div>
            </div>
            <div class="buy_annual_advice">
                <div class="buy_annual_advice_text">
                    <img  style="width:25px; height:25px;" src=${pro_cross_icon_src} alt="" />
                    <p>You’ve been using the monthly plan which is overall <span style="font-weight:bold;">expensive!</span></p>
                </div>
                <div class="buy_annual_advice_text">
                    <img  style="width:25px; height:25px;" src=${pro_check_icon_src} alt="" />
                    <p>Simply buy the <span style="font-weight:bold;">Annual Plan</span> and get <span style="font-weight:bold;">2 months FREE!</span></p>
                </div> 
            </div>
            <div class="buy_annual_recommendation"></div>
        </div>
        <div class="buy_annual_timer_strip">
            <div class="buy_annual_timer_container">
                <div class="buy_annual_timer_img">
                    <img src="${pro_alarm_clock}"/>
                </div>
                <div class="buy_annual_timer_counter">
                    <p>
                        Only <span class="buy_annual_counter" style="font-weight:bold;">4 days, 14 hrs, 57 sec </span>left <br /> to avail the offer
                    </p>
                </div>
            </div>
        </div>
        <div class="buy_annual_button_section">
            <a href=${pricing_page_link} target="_blank" class="buy-annual-popup-btn" buttonType="${plan_type.toLowerCase()}_annual">
                <span class="annual_button_top_span"><img src="${pro_yellow_star}" style="width:15px;"/>Save 40% with</span>
                <span style="font-weight:bold;">${plan_type} Annual</span>
            </a>
        </div>
        ${create_footer_html()}
    `;

  let modal_content = document.createElement("div");
  modal_content.className = "buy_annual_popup_content trial_content";
  modal_content.style.background = "#d3d3d3";
  modal_content.innerHTML = modal_content_html;

  let popup = document.createElement("div");
  popup.className = "buy_annual_popup trial_popup";
  popup.id = "buy_annual_popup";
  popup.appendChild(modal_content);

  let body = document.querySelector("body");
  body.appendChild(popup);

  let close_popup_btn = document.getElementById("buy_annual_close_icon");
  close_popup_btn.addEventListener("click", () => {
    body.removeChild(popup);
    chrome.storage.local.set({
      lastShownAnnualPopup: formatToIsoDate(new Date()),
    });
    trackCloseButtonClick("buy_annual_popup_close");
  });
  $(".buy-annual-popup-btn").on("click", function (event) {
    let buttonType = $(this).attr("buttonType");
    if (buttonType && buttonType.length > 0) {
      trackButtonClick(`buy_annual_popup_${buttonType}_button`);
    }
  });

  changeCounterTime();
  handleAnnualPopupCounter();

  trackButtonView("buy_annual_popup");
}

function changeCounterTime(getCounterInterval) {
  const expiryDate = new Date(expiry_date);
  const currentDate = new Date();
  const diff = expiryDate - currentDate;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  let counterText = "";
  if (days > 0) {
    counterText += `${days} days, `;
  }
  counterText += `${hours} hrs, ${minutes} min, ${seconds} sec `;
  const buyAnnualCouter = document.querySelector(".buy_annual_counter");
  if (!buyAnnualCouter) {
    clearInterval(getCounterInterval);
    return;
  }
  buyAnnualCouter.innerText = counterText;
  if (diff <= 0 && getCounterInterval) {
    clearInterval(getCounterInterval);
  }
}

function handleAnnualPopupCounter() {
  const getCounterInterval = setInterval(() => {
    changeCounterTime(getCounterInterval);
  }, 1000);
}

function getMonthDifference(date1, date2) {
  const [month1, year1] = date1.split(", ");
  const [month2, year2] = date2.split(", ");

  return (
    (parseInt(year2) - parseInt(year1)) * 12 +
    (getMonthIndex(month2) - getMonthIndex(month1))
  );
}

const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
function getMonthIndex(month) {
  return monthNames.indexOf(month);
}

function formatToIsoDate(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}-${month}-${day}`;
}

function dateDiffInDays(date1, date2) {
  if (!date1 || !date2) return NaN;

  const [year1, month1, day1] = date1.split("-").map(Number);
  const [year2, month2, day2] = date2.split("-").map(Number);
  const d1 = new Date(year1, month1 - 1, day1);
  const d2 = new Date(year2, month2 - 1, day2);
  const diffTime = Math.abs(d2 - d1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

async function updateReminderPopup() {
  if (!SHOW_UPDATE_REMINDER_POPUP) return;

  // Remove existing popup if it exists
  if (document.querySelector("#update_reminder_popup")) {
    document
      .querySelector("body")
      .removeChild(document.querySelector("#update_reminder_popup"));
  }

  let update_desc = await translate(
    "You can either restart your Chrome to update or you can go to manage Chrome extension and update it."
  );

  let modal_content_html = `
           <div class="rheader">
            <h2 id="update_popup_title">New Version Available</h2>
        </div>
        <div class="rcenter">
            <div class="rtop" id="update_popup_desc">${update_desc}</div>
            <div class="rbottom">
                <a href="http://chrome://extensions/?id=klfaghfflijdgoljefdlofkoinndmpia" target="_blank">
                    <div id="okBtn" class="popup-btn action-green-btn CtaBtn">Update</div>
                </a>
            </div>
        </div>
        ${create_footer_html()}
    `;

  let modal_content = document.createElement("div");
  modal_content.className = "update_reminder_popup_content trial_content";
  modal_content.style.background = "#62d9c7";
  modal_content.style.zIndex = "100";
  modal_content.style.width = "60%";
  modal_content.innerHTML = modal_content_html;
  modal_content.appendChild(
    $(
      $.parseHTML(
        '<span id="close_update" style="position: absolute;top: 12px;right: 12px;font-size: 20px;width:14px"><img class="CtaCloseBtn" src="' +
        pro_close_img_src +
        '" style="width: 100%;" alt="x"></span>'
      )
    )[0]
  );

  let popup = document.createElement("div");
  popup.className = "update_reminder_popup";
  popup.id = "update_reminder_popup";
  popup.style.height = "100%";
  popup.style.display = "flex";
  popup.appendChild(modal_content);

  document.querySelector("body").appendChild(popup);

  document.querySelector("#okBtn").addEventListener("click", () => {
    document.querySelector("body").removeChild(popup);
  });
  document
    .getElementById("close_update")
    .addEventListener("click", function (event) {
      document.querySelector("body").removeChild(popup);
    });
  document.querySelector("#closePopupBtn").addEventListener("click", () => {
    document.querySelector("body").removeChild(popup);
  });
}

// ---- config-data OR prodata.js related functions ---

function getDocumentElement(key, selectAll = false) {
  try {
    if (DOCUMENT_ELEMENT_SELECTORS[key]) {
      for (const className of DOCUMENT_ELEMENT_SELECTORS[key]) {
        const element = selectAll
          ? document.querySelectorAll(className)
          : document.querySelector(className);
        if (element) {
          return element;
        }
      }
    } else {
      console.log("Selector not exists:", key);
    }
  } catch (err) {
    console.log("Error while finding document element", err);
  }
  return null;
}

async function fetchConfigData() {
  try {
    const url = `${AWS_API.GET_CONFIG_DATA}?operation=get-all-config-data`;
    const response = await fetch(url);
    const jsonData = await response.json();
    const allConfigData = jsonData.data;

    if (allConfigData && Array.isArray(allConfigData)) {
      const configMap = createConfigMap(allConfigData);
      loadConfigData(configMap);

      chrome.storage.local.get(["CONFIG_DATA"], (res) => {
        // console.log("OLD CONFIG DATA:", res.CONFIG_DATA);
        chrome.storage.local.set({ CONFIG_DATA: configMap });
      });
    } else {
      console.log("Config data not found. Api response:", jsonData);
    }
  } catch (err) {
    console.log("Error while fetching config data:", err);
  }
}

function createConfigMap(configArray) {
  const configMap = {};
  configArray.forEach((item) => {
    if (item.name && item.data !== null) {
      configMap[item.name] = item.data;
    }
  });
  return configMap;
}

// Load AWS Config Data from API to Local Data (for content js)
function loadConfigData(configMap) {
  // Constant Arrays
  if (configMap.TRIAL_FEATURES) TRIAL_FEATURES = [...configMap.TRIAL_FEATURES];
  if (configMap.PREMIUM_FEATURES)
    PREMIUM_FEATURES = [...configMap.PREMIUM_FEATURES];
  // if (configMap.DID_YOU_KNOW_TIPS)
  //     DID_YOU_KNOW_TIPS = [...configMap.DID_YOU_KNOW_TIPS];
  // if (configMap.ALL_LANGUAGE_CODES)
  //     ALL_LANGUAGE_CODES = [...configMap.ALL_LANGUAGE_CODES];

  // Constant Objects
  if (configMap.HELP_MESSAGES) HELP_MESSAGES = { ...HELP_MESSAGES };
  if (configMap.GA_CONFIG) GA_CONFIG = { ...configMap.GA_CONFIG };
  // if (configMap.POPUP_DATA)
  //     POPUP_DATA = { ...configMap.POPUP_DATA };
  if (configMap.PRICING_DATA) PRICING_DATA = { ...configMap.PRICING_DATA };
  if (configMap.PREMIUM_REMINDER)
    PREMIUM_REMINDER = { ...configMap.PREMIUM_REMINDER };
  // if (configMap.SUCCESS_POPUP_DATA)
  //     SUCCESS_POPUP_DATA = { ...configMap.SUCCESS_POPUP_DATA };
  if (configMap.DOCUMENT_ELEMENT_SELECTORS)
    DOCUMENT_ELEMENT_SELECTORS = { ...configMap.DOCUMENT_ELEMENT_SELECTORS };
  if (configMap.FAQS) FAQS = { ...configMap.FAQS };
  if (configMap.RUNTIME_CONFIG) {
    RUNTIME_CONFIG = { ...configMap.RUNTIME_CONFIG };
    if (RUNTIME_CONFIG.reloadInject) {
      window.dispatchEvent(
        new CustomEvent("PROS::init", {
          detail: { useOldMethod: RUNTIME_CONFIG.useOldInjectMethod },
        })
      );
    }
  }

  //Constant Variable
  // if("SHOW_UPDATE_REMINDER_POPUP" in configMap)
  //     SHOW_UPDATE_REMINDER_POPUP=configMap.SHOW_UPDATE_REMINDER_POPUP;

  // NOT WORKING - Contains Complex Key-Value Pair
  // if (configMap.REPLACEMENT_HTML_TAGS) `
  //     REPLACEMENT_HTML_TAGS = { ...configMap.REPLACEMENT_HTML_TAGS };
}

var ban_text_detected = false;
function detectBanText() {
  if (ban_text_detected) return;

  let banMessages = [
    "verify your phone number",
    "you will need to verify your phone number",
    "You have been logged out. To log back in, you will need to verify your phone number.", // English
    "à¤†à¤ª à¤²à¥‰à¤— à¤†à¤‰à¤Ÿ à¤¹à¥‹ à¤—à¤ à¤¹à¥ˆà¤‚à¥¤ à¤«à¤¿à¤° à¤¸à¥‡ à¤²à¥‰à¤— à¤‡à¤¨ à¤•à¤°à¤¨à¥‡ à¤•à¥‡ à¤²à¤¿à¤, à¤†à¤ªà¤•à¥‹ à¤…à¤ªà¤¨à¤¾ à¤«à¤¼à¥‹à¤¨ à¤¨à¤‚à¤¬à¤° à¤¸à¤¤à¥à¤¯à¤¾à¤ªà¤¿à¤¤ à¤•à¤°à¤¨à¤¾ à¤¹à¥‹à¤—à¤¾à¥¤", // Hindi
    "VocÃª foi desconectado. Para fazer login novamente, será necessário verificar seu número de telefone.", // Brazilian Portuguese
    "Has cerrado sesión. Para volver a iniciar sesión, deberás verificar tu número de teléfono.", // Spanish
  ];

  for (const message of banMessages) {
    if (
      document.body.innerText.includes(message) ||
      document.body.innerText
        .toLowerCase()
        .includes(message.toLocaleLowerCase())
    ) {
      trackSystemEvent("banned_text", banMessages);
      ban_text_detected = true;
    }
  }
}

async function messageCountOverPopup() {
  let {
    name: country_name,
    name_code: country_code,
    currency: country_currency,
  } = location_info;
  if (Object.keys(COUNTRY_WITH_SPECIFIC_PRICING).includes(country_code)) {
    country_name = COUNTRY_WITH_SPECIFIC_PRICING[country_code];
  } else {
    country_name = "international";
  }

  let body = document.querySelector("body");
  let popup = document.createElement("div");
  let modal_content = document.createElement("div");

  let popup_button = getPremiumReminderButton("Premium");

  if (document.querySelector(".premium_reminder_popup")) {
    body.removeChild(document.querySelector(".premium_reminder_popup"));
  }

  let remaining_count = 0;
  let total_count = 0;
  await new Promise((resolve) => {
    chrome.storage.local.get(["freeTrialExpiredUserData"], function (res) {
      const freeTrialExpiredUserData = res.freeTrialExpiredUserData;
      if (
        freeTrialExpiredUserData &&
        freeTrialExpiredUserData.sent_count != undefined &&
        freeTrialExpiredUserData.total_count != undefined
      ) {
        remaining_count =
          freeTrialExpiredUserData.total_count -
          freeTrialExpiredUserData.sent_count;
        total_count = freeTrialExpiredUserData.total_count;
      }
      resolve();
    });
  });

  popup.className = "premium_reminder_popup trial_popup";

  modal_content.className = "premium_reminder_content trial_content";
  modal_content.style.background = "#d5cd2f";
  modal_content.innerHTML = `
        <span id="close_premium_reminder_popup">
            <img class="CtaCloseBtn" src="${pro_close_img_src}" alt="x">
        </span>
        <div class="premium_reminder_popup_title">
            <span class="oops_icon"></span>Oops!
        </div>
        <div class="reminder_title">
            ${`You have ${remaining_count} of daily ${total_count} messages remaining`}
        </div>
        <div class="reminder_description">
            ${await translate(
    `Please buy <<${"Premium"}>> to send unlimited messages!`
  )}
        </div>
        <div style="display:flex;justify-content:center;gap:20px;width:100%;margin-bottom:20px;">
            ${popup_button}
        </div> 
        <div style="display:flex;justify-content:center;align-items:center;gap:5px;">
            <img src=${large_logo_img} style="width:25px;" />
            <span style="font-weight:bold;">Pro Sender</span>
        </div>
        `;
  popup.appendChild(modal_content);
  body.appendChild(popup);

  let closePopupBtn = document.getElementById("close_premium_reminder_popup");
  closePopupBtn.addEventListener("click", function () {
    body.removeChild(popup);
    trackCloseButtonClick("premium_feature_buy_popup_close");
  });
  $(".popup-btn").on("click", function (event) {
    let buttonType = $(this).attr("buttonType");
    if (buttonType && buttonType.length > 0) {
      trackButtonClick(`premium_feature_buy_popup_${buttonType}_button`);
    }
  });

  trackButtonView("premium_feature_buy_popup");
}

function showTooltip({
  elementParentClass,
  text,
  positionTop,
  positionBottom,
  positionLeft,
  positionRight,
}) {
  const parentElement = document.querySelector(elementParentClass);
  const tooltip = document.createElement("div");
  tooltip.className = "tooltip_main_container";
  if (positionTop) tooltip.style.top = positionTop;
  if (positionBottom) tooltip.style.bottom = positionBottom;
  if (positionLeft) tooltip.style.left = positionLeft;
  if (positionRight) tooltip.style.right = positionRight;
  tooltip.innerHTML = `
        <div>
            ${text}
        </div>
        <div class="tooltip_arrow"></div>
    `;
  parentElement.appendChild(tooltip);
}

function removeTooltip() {
  const tooltip = document.querySelector(".tooltip_main_container");
  if (tooltip) {
    tooltip.remove();
  }
}

function handleShowTooltip(element) {
  const parentElement = document.querySelector(element.query);
  if (parentElement) {
    parentElement.addEventListener("mouseover", () => {
      showTooltip({
        elementParentClass: element.query,
        text: element.text,
        positionTop: element.top,
        positionLeft: element.left,
        positionRight: element.right,
        positionBottom: element.bottom,
      });
    });
    parentElement.addEventListener("mouseout", () => {
      removeTooltip();
    });
  }
}

let chatbotProcessedMessages = new Set();
let chatbotLastReplyTime = {};


function processChatbotMessageFromStore(msg) {
  try {

    if (!msg.body || msg.body.trim().length === 0) {
      return;
    }

    // Handle LID format in msg.from
    const rawId = msg.from || "";
    const isLid = rawId.includes("@lid");
    const isGroup = msg.isGroupMsg || rawId.includes("@g.us");

    // Strip all suffixes to get clean number
    const number = rawId
      .replace("@c.us", "")
      .replace("@g.us", "")
      .replace("@lid", "");

    const senderInfo = {
      number: number,
      name: msg.senderName,
      isGroup: isGroup,
      isLid: isLid,
      rawId: rawId
    };

    processChatbotMessage(msg.body, senderInfo);

  } catch (error) {
    console.error("Error processing message from Store:", error);
  }
}

function processPotentialChatbotMessage(node) {
  try {

    const messageElement = node.closest('[data-testid="msg-container"]') ||
      node.closest('[role="article"]');

    if (!messageElement) {
      return;
    }

    const isOutgoing = messageElement.classList.contains('message-out') ||
      messageElement.classList.contains('msg-dsl') &&
      messageElement.querySelector('[data-testid="msg-time"]')?.closest('.message-out');


    if (isOutgoing) {
      return;
    }

    const messageText = extractMessageText(messageElement);

    if (!messageText || messageText.trim().length === 0) {
      return;
    }
    const messageId = generateMessageId(messageElement);
    if (chatbotProcessedMessages.has(messageId)) {
      return;
    }
    chatbotProcessedMessages.add(messageId);

    const senderInfo = extractSenderInfo(messageElement);
    if (!senderInfo) {
      return;
    }

    processChatbotMessage(messageText, senderInfo);

  } catch (error) {
    console.error("âŒ Error processing potential chatbot message:", error);
    console.error("   Stack:", error.stack);
  }
}


function extractMessageText(messageElement) {
  try {

    const textSelectors = [
      '.selectable-text.copyable-text',
      '[data-testid="msg-text"]',
      '.message-text',
      '.ql-editor'
    ];

    for (const selector of textSelectors) {
      const textElement = messageElement.querySelector(selector);

      if (textElement) {
        const text = textElement.innerText || textElement.textContent;
        return text;
      }
    }


    const fallbackText = messageElement.innerText || messageElement.textContent;
    return fallbackText;
  } catch (error) {
    console.error("âŒ Error extracting message text:", error);
    return null;
  }
}


function generateMessageId(messageElement) {
  try {

    const timeElement = messageElement.querySelector('[data-testid="msg-time"]');
    const timestamp = timeElement?.getAttribute('data-timestamp') ||
      timeElement?.innerText ||
      Date.now();

    const messageText = extractMessageText(messageElement);
    return `${timestamp}_${messageText.substring(0, 20)}`;
  } catch (error) {
    return `msg_${Date.now()}_${Math.random()}`;
  }
}


function extractSenderInfo(messageElement) {
  try {

    const convMsgDiv = getDocumentElement("conversation_message_div");
    if (!convMsgDiv || !convMsgDiv.dataset["id"]) {

      return null;
    }
    const chatId = convMsgDiv.dataset["id"];
    const isGroup = chatId.includes("@g.us");
    const isLid = chatId.includes("@lid");

    // Handle both formats: "true_123@lid" or "123@lid"
    let rawId = chatId.includes("_") ? chatId.split("_")[1] : chatId;

    const senderNameElement = messageElement.querySelector('.copyable-text');
    const senderName = senderNameElement?.innerText || "Unknown";
    let number = rawId
      .replace("@c.us", "")
      .replace("@g.us", "")
      .replace("@lid", "");

    return {
      name: senderName,
      number: number,
      isGroup: isGroup,
      isLid: isLid,
      chatId: chatId,
      rawId: rawId
    };
  } catch (error) {
    console.error("Error extracting sender info:", error);
    return null;
  }
}


function processChatbotMessage(messageText, senderInfo) {
  chrome.storage.local.get([
    "chatbotSettings",
    "unsubscribe_enabled",
    "unsubscribe_keyword",
    "unsubscribedNumbers"
  ], async (result) => {
    // Unsubscribe Logic
    try {
      if (result.unsubscribe_enabled && isAdvanceFeatureAvailable()) {
        const keyword = (result.unsubscribe_keyword || "STOP").toLowerCase();
        if (messageText && messageText.trim().toLowerCase() === keyword) {
          let unsubscribedNumbers = result.unsubscribedNumbers || [];

          // Get the actual phone number - resolve LID if needed
          let actualNumber = senderInfo.number;

          if (senderInfo.isLid && senderInfo.rawId) {
            // Dispatch event to resolve LID via injected script
            // Create a unique callback ID for this resolution
            const callbackId = `lid_resolve_${Date.now()}`;

            // Listen for the response
            const resolvedNumber = await new Promise((resolve) => {
              const handleResponse = (event) => {
                if (event.detail?.callbackId === callbackId) {
                  document.removeEventListener("PROS::lid-resolved", handleResponse);
                  resolve(event.detail.resolvedNumber);
                }
              };
              document.addEventListener("PROS::lid-resolved", handleResponse);

              // Dispatch request to injected script (use document for cross-context)
              document.dispatchEvent(new CustomEvent("PROS::resolve-lid", {
                detail: {
                  lid: senderInfo.rawId,
                  callbackId: callbackId
                }
              }));

              // Timeout after 3 seconds
              setTimeout(() => {
                document.removeEventListener("PROS::lid-resolved", handleResponse);
                resolve(null);
              }, 3000);
            });

            if (resolvedNumber && resolvedNumber !== senderInfo.rawId) {
              // Extract phone number from resolved ID (e.g., "919555505381@c.us" -> "919555505381")
              actualNumber = resolvedNumber.replace("@c.us", "").replace("@g.us", "");
            }
          }

          // Normalize number like in promsg.js (digits only)
          const normalizedNumber = actualNumber.replace(/\D/g, "");

          const isAlreadyUnsubscribed = unsubscribedNumbers.some(entry => {
            if (typeof entry === 'string') return entry === normalizedNumber;
            return entry.number === normalizedNumber;
          });

          if (!isAlreadyUnsubscribed) {
            unsubscribedNumbers.push({
              number: normalizedNumber,
              timestamp: new Date().getTime()
            });
            chrome.storage.local.set({ unsubscribedNumbers: unsubscribedNumbers });
            console.log(`Number ${normalizedNumber} has unsubscribed at ${new Date().toLocaleString()}.`);
          }
        }
      }
    } catch (error) {
      console.error("âŒ Error processing unsubscribe logic:", error);
    }

    try {
      const chatbotSettings = result.chatbotSettings;

      if (!chatbotSettings || !chatbotSettings.enabled) {
        return;
      }

      if (!isAdvanceFeatureAvailable()) {
        return;
      }
      const rules = chatbotSettings.rules || [];
      if (rules.length === 0) {
        return;
      }

      const matchingRule = findMatchingRule(messageText, rules);
      if (!matchingRule) {
        return;
      }

      if (!canSendReply(senderInfo.number)) {
        return;
      }

      await sendChatbotReply(matchingRule, senderInfo);
      updateChatbotReplyStats(matchingRule);

    } catch (error) {
      console.error("  âŒ Error processing chatbot message:", error);
      console.error("     Stack:", error.stack);
    }
  });
}


function findMatchingRule(messageText, rules) {


  for (const rule of rules) {
    const keyword = rule.keyword;
    const caseSensitive = rule.caseSensitive || false;
    const exactMatch = rule.exactMatch || false;

    const textToCompare = caseSensitive ? messageText : messageText.toLowerCase();
    const keywordList = keyword.split(",").map(k => k.trim());

    let isMatch = false;
    for (const kw of keywordList) {
      const keywordToCompare = caseSensitive ? kw : kw.toLowerCase();

      isMatch = textToCompare.trim() === keywordToCompare.trim();
      if (isMatch) {
        return rule;
      }
    }
  }

  return null;
}


function canSendReply(contactNumber) {
  const RATE_LIMIT_MS = 30000; // 30 seconds

  const lastReplyTime = chatbotLastReplyTime[contactNumber] || 0;
  const now = Date.now();

  if (now - lastReplyTime < RATE_LIMIT_MS) {
    return false;
  }

  return true;
}


async function sendChatbotReply(rule, senderInfo) {
  try {
    chatbotLastReplyTime[senderInfo.number] = Date.now();

    let chatId = senderInfo.number;

    if (!chatId.includes("@")) {
      chatId = `${chatId}@c.us`;
    }
    window.dispatchEvent(
      new CustomEvent("PROS::chatbot-typing-status", {
        detail: {
          chatId: chatId,
          isTyping: true
        }
      })
    );

    const delayMs = 1000 + Math.random() * 10000;
    await new Promise(resolve => setTimeout(resolve, delayMs));
    window.dispatchEvent(
      new CustomEvent("PROS::chatbot-typing-status", {
        detail: {
          chatId: chatId,
          isTyping: false
        }
      })
    );

    if (rule.blob && rule.fileName) {
      // Send with attachment
      window.dispatchEvent(
        new CustomEvent("PROS::send-attachments", {
          detail: {
            number: senderInfo.number,
            attachments: [{ data: rule.blob, name: rule.fileName }],
            caption: [rule.response || ''],
            waitTillSend: true,
            chatbot: true
          }
        })
      );
    } else {
      // Standard text-only reply
      window.dispatchEvent(
        new CustomEvent("PROS::chatbot-send-reply", {
          detail: {
            chatId: chatId,
            message: rule.response,
            isGroup: senderInfo.isGroup
          }
        })
      );
    }
    updateChatbotReplyStats();

  } catch (error) {
    console.error("âŒ Error sending chatbot reply:", error);
  }
}


function updateChatbotReplyStats(matchedRule) {
  chrome.storage.local.get(["chatbotSettings"], (result) => {
    try {
      let chatbotSettings = result.chatbotSettings || {
        enabled: false,
        rules: [],
        repliesSent: 0
      };

      chatbotSettings.repliesSent = (chatbotSettings.repliesSent || 0) + 1;

      // Increment triggerCount for the specific rule
      if (matchedRule && chatbotSettings.rules) {
        chatbotSettings.rules = chatbotSettings.rules.map(rule => {
          if (rule.keyword === matchedRule.keyword && rule.response === matchedRule.response) {
            rule.triggerCount = (rule.triggerCount || 0) + 1;
          }
          return rule;
        });
      }

      chrome.storage.local.set({ chatbotSettings: chatbotSettings });

      chrome.runtime.sendMessage({
        type: "chatbot_stats_updated",
        repliesSent: chatbotSettings.repliesSent
      }).catch(() => {
        // Popup might not be open, ignore error
      });

    } catch (error) {
      console.error("âŒ Error updating chatbot stats:", error);
    }
  });
}

function generateUUID() {
  const length = Math.floor(Math.random() * 7) + 10;
  const chars = 'x'.repeat(length);
  return chars.replace(/[x]/g, function (c) {
    const r = Math.random() * 16 | 0;
    return r.toString(16);
  });
}


function appendUniqueIdentifier(message, caption) {
  const uuid = generateUUID();
  const identifier = `\n\n[ID: ${uuid}]`;

  return {
    message: message ? message + identifier : null,
    caption: caption ? caption + identifier : null
  };
}


async function isUniqueIdentifierEnabled() {
  return new Promise((resolve) => {
    const checkbox = document.getElementById('addUniqueIdentifier');
    if (checkbox && checkbox.checked) {
      resolve(true);
    } else {
      chrome.storage.local.get('addUniqueIdentifier', (result) => {
        resolve(result.addUniqueIdentifier === true);
      });
    }
  });
}



// =================================================================
// CYBER WHATSAPP PRO — TOTAL PRICING / UPGRADE BLOCK SUPPRESSION
// =================================================================

function show_trial_popups()                                { return; }
function check_web_and_show_trial_popups()                  { checkAndShowBanner(); }
async function showBuyPremiumButtons()                      { return; }
async function create_pricing_buttons_html()                { return ""; }
async function getBasicPremiumExpiredButton()               { return { basicButtonHtml: "", advanceButtonHtml: "" }; }
async function getAdvancePremiumExpiredButton()             { return ""; }
function getFreeTrialButtonHtml()                           { return ""; }
function getMultipleAccountButtonHtml()                     { return ""; }
async function showMessgesRemainingDiv()                    { return; }
function checkFreeTrialExpiredUserSendLimit()               { return true; }
async function handleFreeTrialExpiredUser()                 { return { isFreeTrialExpiredUser: false, freeTrialExpiredUserData: {} }; }
function getNonPremiumHeaderText()                          { return "Cyber WhatsApp Pro"; }
function isFreeTrial()                                      { return false; }
function isExpired()                                        { return false; }
function isBasic()                                          { return false; }
function isAdvance()                                        { return true;  }
function isPremium()                                        { return true;  }
function isPremiumExpired()                                 { return false; }
function isAdvancePromo()                                   { return false; }
function isTrial()                                          { return false; }
function isBasicFeatureAvailable()                          { return true;  }
function isAdvanceFeatureAvailable()                        { return true;  }
function isPremiumFeatureAvailable()                        { return true;  }

// Block buy_premium_popup and all upgrade message types at the listener level
(function() {
  var _origAddListener = chrome.runtime.onMessage.addListener.bind(chrome.runtime.onMessage);
  // Wrap sendChromeMessage to drop pricing messages
  var _origSend = sendChromeMessage;
  window.sendChromeMessage = function(msg) {
    if (!msg) return;
    var blocked = ["show_premium_popup","show_advance_popup","buy_premium_popup",
                   "free_trial_start","free_trial_reminder","free_trial_expired",
                   "advance_promo_activated","advance_promo_reminder","advance_promo_expired",
                   "premium_expired","show_message_count_over_popup","show_upgrade_popup"];
    if (blocked.includes(msg.type)) return;
    _origSend(msg);
  };
})();


// =================================================================
// CYBER WHATSAPP PRO — FINAL PRICING POPUP FUNCTION KILL
// =================================================================

// Stub display_popup — silently drop ALL upgrade/trial/expired popups
async function display_popup(popup_name, date_diff) {
  const blocked = [
    "free_trial_start","free_trial_reminder","free_trial_expired",
    "advance_promo_start","advance_promo_activated","advance_promo_reminder","advance_promo_expired",
    "premium_expired","buy_premium","show_premium","show_upgrade"
  ];
  if (!popup_name || blocked.includes(popup_name)) return;
  // allow non-pricing popups to pass (e.g. success confirmations)
}

// Stub buyAnnualPopup — never show annual upgrade modal
async function buyAnnualPopup() { return; }

// Stub create_popup_html — return empty for any pricing popup
async function create_popup_html(popup_name, date_diff) {
  const blocked = [
    "free_trial_start","free_trial_reminder","free_trial_expired",
    "advance_promo_start","advance_promo_activated","advance_promo_reminder","advance_promo_expired",
    "premium_expired","buy_premium","show_premium"
  ];
  if (!popup_name || blocked.includes(popup_name)) return "";
  return "";
}

// Stub show_trial_popups — hard kill
function show_trial_popups()                                { return; }
function check_web_and_show_trial_popups()                  { try { checkAndShowBanner(); } catch(e) {} }

// Stub all remaining buy/pricing/invoice functions
async function showBuyPremiumButtons()                      { return; }
async function create_pricing_buttons_html()                { return ""; }
async function getBasicPremiumExpiredButton()               { return { basicButtonHtml:"", advanceButtonHtml:"" }; }
async function getAdvancePremiumExpiredButton()             { return ""; }
function getFreeTrialButtonHtml()                           { return ""; }
function getMultipleAccountButtonHtml()                     { return ""; }
async function showMessgesRemainingDiv()                    { return; }

// Force plan state
function isFreeTrial()                                      { return false; }
function isExpired()                                        { return false; }
function isBasic()                                          { return false; }
function isAdvance()                                        { return true;  }
function isPremium()                                        { return true;  }
function isPremiumExpired()                                 { return false; }
function isAdvancePromo()                                   { return false; }
function isTrial()                                          { return false; }
function isBasicFeatureAvailable()                          { return true;  }
function isAdvanceFeatureAvailable()                        { return true;  }
function isPremiumFeatureAvailable()                        { return true;  }
function checkFreeTrialExpiredUserSendLimit()               { return true; }
async function handleFreeTrialExpiredUser()                 { return { isFreeTrialExpiredUser: false, freeTrialExpiredUserData:{} }; }
function getNonPremiumHeaderText()                          { return "Cyber WhatsApp Pro"; }

// Keep plan_type variable in sync with override functions so no expired text leaks into UI
plan_type      = "Advance";
last_plan_type = "Advance";

// ═══════════════════════════════════════════════════════════════
// CWP POPUP → CONTENT SCRIPT MESSAGE BRIDGE
// ═══════════════════════════════════════════════════════════════
// CWP FLOATING PANEL — iframe injected into WhatsApp Web, draggable + resizable
// ═══════════════════════════════════════════════════════════════
(function cwpFloatingPanel() {
  // Guard to prevent double-initialization on re-injection
  if (window.__cwpFloatingPanelInitialized) return;
  window.__cwpFloatingPanelInitialized = true;

  const PANEL_ID    = "cwp-floating-panel";
  const PROPUP_URL  = chrome.runtime.getURL("propup.html");

  // ── Inject once ────────────────────────────────────────────────────────────
  function buildPanel() {
    if (document.getElementById(PANEL_ID)) return;

    // ── Outer wrapper (drag handle + resize container) ──
    const wrapper = document.createElement("div");
    wrapper.id = PANEL_ID;
    wrapper.style.cssText = [
      "position:fixed",
      "top:8px",
      "right:12px",
      "width:860px",
      "height:calc(100vh - 20px)",
      "min-width:820px",
      "min-height:400px",
      "max-width:calc(100vw - 20px)",
      "max-height:calc(100vh - 20px)",
      "z-index:2147483647",
      "display:flex",
      "flex-direction:column",
      "border-radius:12px",
      "box-shadow:0 8px 40px rgba(0,0,0,0.55)",
      "overflow:hidden",
      "resize:both",
      "background:#111720",
      "border:1px solid #1e2a3a",
      "font-family:sans-serif",
    ].join(";");

    // ── Title bar (drag handle) ──
    const titleBar = document.createElement("div");
    titleBar.id = "cwp-titlebar";
    titleBar.style.cssText = [
      "display:flex",
      "align-items:center",
      "justify-content:space-between",
      "background:#0b0f14",
      "padding:8px 14px",
      "cursor:grab",
      "user-select:none",
      "border-bottom:1px solid #1e2a3a",
      "flex-shrink:0",
    ].join(";");

    const titleLeft = document.createElement("div");
    titleLeft.style.cssText = "display:flex;align-items:center;gap:8px;";

    const logo = document.createElement("img");
    logo.src = chrome.runtime.getURL("logo/pro-small.png");
    logo.style.cssText = "width:20px;height:20px;border-radius:5px;";

    const titleText = document.createElement("span");
    titleText.textContent = "Cyber WhatsApp Pro";
    titleText.style.cssText = "color:#e0eaf5;font-size:13px;font-weight:700;letter-spacing:.02em;";

    titleLeft.appendChild(logo);
    titleLeft.appendChild(titleText);

    const btns = document.createElement("div");
    btns.style.cssText = "display:flex;align-items:center;gap:6px;";

    // Minimize button
    const minBtn = document.createElement("button");
    minBtn.title = "Minimise";
    minBtn.textContent = "−";
    minBtn.style.cssText = "background:#1e2a3a;border:none;color:#8fa8c4;font-size:14px;width:24px;height:24px;border-radius:6px;cursor:pointer;line-height:1;";

    // Close button
    const closeBtn = document.createElement("button");
    closeBtn.title = "Close panel";
    closeBtn.textContent = "×";
    closeBtn.style.cssText = "background:#1e2a3a;border:none;color:#ff5252;font-size:16px;width:24px;height:24px;border-radius:6px;cursor:pointer;line-height:1;";

    btns.appendChild(minBtn);
    btns.appendChild(closeBtn);
    titleBar.appendChild(titleLeft);
    titleBar.appendChild(btns);

    // ── iFrame ──
    const iframe = document.createElement("iframe");
    iframe.id  = "cwp-iframe";
    iframe.src = PROPUP_URL;
    iframe.style.cssText = [
      "flex:1",
      "border:none",
      "width:100%",
      "height:100%",
      "background:#fff",
      "display:block",
      "overflow-y:auto",
    ].join(";");
    iframe.allow = "clipboard-read; clipboard-write";

    wrapper.appendChild(titleBar);
    wrapper.appendChild(iframe);
    document.body.appendChild(wrapper);

    // ── Drag logic ──
    let isDragging = false, startX, startY, startLeft, startTop;

    titleBar.addEventListener("mousedown", (e) => {
      if (e.target === minBtn || e.target === closeBtn) return;
      isDragging = true;
      titleBar.style.cursor = "grabbing";
      startX = e.clientX;
      startY = e.clientY;
      const rect = wrapper.getBoundingClientRect();
      startLeft = rect.left;
      startTop  = rect.top;
      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const newLeft = Math.max(0, Math.min(window.innerWidth  - wrapper.offsetWidth,  startLeft + dx));
      const newTop  = Math.max(0, Math.min(window.innerHeight - wrapper.offsetHeight, startTop  + dy));
      wrapper.style.left  = newLeft + "px";
      wrapper.style.top   = newTop  + "px";
      wrapper.style.right = "auto";
    });

    document.addEventListener("mouseup", () => {
      isDragging = false;
      titleBar.style.cursor = "grab";
    });

    // ── Minimize / restore ──
    let minimised = false;
    minBtn.addEventListener("click", () => {
      minimised = !minimised;
      iframe.style.display  = minimised ? "none"  : "block";
      wrapper.style.height  = minimised ? "auto"  : "calc(100vh - 20px)";
      wrapper.style.resize  = minimised ? "none"  : "both";
      minBtn.textContent    = minimised ? "□"    : "−";
      minBtn.title          = minimised ? "Restore" : "Minimise";
    });

    // ── Close ──
    closeBtn.addEventListener("click", () => {
      wrapper.remove();
    });

    // ── Auto-minimise when a send-report popup appears in the page ──
    // The .messanger_popup is rendered in the WhatsApp DOM at z-index:1000
    // but the panel sits at z-index:2147483647 and blocks it.
    // Solution: watch for .messanger_popup and auto-minimise the panel until it's gone.
    const reportObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== 1) continue;
          const isReport =
            node.classList?.contains("messanger_popup") ||
            node.classList?.contains("free_trial_start") ||
            node.querySelector?.(".messanger_popup");
          if (isReport && !minimised) {
            // Auto-minimise the panel
            minimised = true;
            iframe.style.display  = "none";
            wrapper.style.height  = "auto";
            wrapper.style.resize  = "none";
            minBtn.textContent    = "\u25A1"; // restore icon
            minBtn.title          = "Restore";
            // Watch for the popup to be removed then restore
            const restoreObserver = new MutationObserver((muts2) => {
              for (const m of muts2) {
                for (const removedNode of m.removedNodes) {
                  const wasReport =
                    removedNode.classList?.contains("messanger_popup") ||
                    removedNode.classList?.contains("free_trial_start") ||
                    removedNode.querySelector?.(".messanger_popup");
                  if (wasReport) {
                    // Restore the panel
                    minimised = false;
                    iframe.style.display  = "block";
                    wrapper.style.height  = "calc(100vh - 20px)";
                    wrapper.style.resize  = "both";
                    minBtn.textContent    = "\u2212";
                    minBtn.title          = "Minimise";
                    restoreObserver.disconnect();
                  }
                }
              }
            });
            restoreObserver.observe(document.body, { childList: true, subtree: true });
          }
        }
      }
    });
    reportObserver.observe(document.body, { childList: true, subtree: false });
  }

  // ── Toggle: show or remove the panel ─────────────────────────────────
  window.togglePanel = function togglePanel() {
    const existing = document.getElementById(PANEL_ID);
    if (existing) {
      existing.remove();
    } else {
      buildPanel();
    }
  }

  // ── Listen for the message from popup.js ─────────────────────────────
  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action === "cwp_open_panel") {
      togglePanel();
      sendResponse({ success: true });
      return false;
    }
  });

  // ── Also listen for the DOM custom event from procntt internal calls ──
  document.addEventListener("cwp_open_panel", () => togglePanel());

})();
// ═══════════════════════════════════════════════════════════════

// Handles messages sent from popup.js to the WhatsApp Web tab
// ═══════════════════════════════════════════════════════════════

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // ── Single message send from popup Send button ──
  if (request.action === "cwp_send_single") {
    cwpSendSingle(request.number, request.message)
      .then(()  => sendResponse({ success: true }))
      .catch(e  => sendResponse({ success: false, error: e.message }));
    return true; // keep channel open for async response
  }

  // cwp_open_panel is handled by cwpFloatingPanel() IIFE above — no duplicate handling here
});

/**
 * cwpSendSingle — send a text message to a phone number via WhatsApp Web.
 * Uses the wa.me URL navigation + simulated send-button click approach.
 */
async function cwpSendSingle(number, message) {
  return new Promise((resolve, reject) => {
    try {
      // Navigate the current tab to the WhatsApp send URL
      const encodedMsg = encodeURIComponent(message);
      const sendUrl    = `https://web.whatsapp.com/send?phone=${number}&text=${encodedMsg}`;

      // Replace current URL silently via history API so we stay on the same tab
      // Then wait for the send button to become available and click it
      window.location.href = sendUrl;

      // Poll for the send button after navigation
      let attempts = 0;
      const maxAttempts = 60; // 30 seconds max

      const poller = setInterval(() => {
        attempts++;
        if (attempts > maxAttempts) {
          clearInterval(poller);
          reject(new Error("Send button not found — WhatsApp may be loading."));
          return;
        }

        // Look for WhatsApp's send button (data-testid or aria-label vary by version)
        const sendBtn =
          document.querySelector('[data-testid="send"]') ||
          document.querySelector('[data-icon="send"]') ||
          document.querySelector('span[data-icon="send"]')?.closest('[role="button"]') ||
          document.querySelector('button[aria-label="Send"]') ||
          document.querySelector('.tvf2evcx.oZCGd2jl');

        if (sendBtn) {
          clearInterval(poller);
          setTimeout(() => {
            try { sendBtn.click(); resolve(); }
            catch (e) { reject(e); }
          }, 400); // small delay after button appears
        }
      }, 500);

    } catch (e) {
      reject(e);
    }
  });
}
