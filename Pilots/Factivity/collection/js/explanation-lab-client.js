/**
 * Explanation Lab study client v1.5.1
 *
 * Shared, browser-native submission client for jsPsych studies hosted on
 * GitHub Pages. Configure this file once for the lab, then host this exact
 * version at a stable URL so deployed studies never change unexpectedly.
 */

const CLIENT_VERSION = "1.5.1";
const FIREBASE_SDK_VERSION = "12.16.0";

// Firebase's web configuration is public by design. Replace these placeholders
// once, in the centrally hosted copy of this file. Never put a service-account
// credential or private key here.
const LAB_CONFIG = Object.freeze({
  firebase: {
    apiKey: "AIzaSyCY39Z3Ej0qHQvLh8qWdCM03MFPGXXAe1E",
    authDomain: "explanation-lab-studies.firebaseapp.com",
    projectId: "explanation-lab-studies",
    storageBucket: "explanation-lab-studies.firebasestorage.app",
    messagingSenderId: "934653534012",
    appId: "1:934653534012:web:1df486c3ea3b7e4cc1c839",
  },
  appCheckSiteKey: "6Lfxq4QtAAAAAL0lWL9xFMz4O75yQqc9cc_-31rP",
});

function configured(config) {
  return Boolean(
    config.firebase.apiKey &&
      !config.firebase.apiKey.startsWith("__") &&
      config.firebase.projectId &&
      !config.firebase.projectId.startsWith("__"),
  );
}

export function normalizeTrials(input) {
  // Arrays also expose Array.prototype.values(), which returns an iterator.
  // Preserve normal arrays and call values() only for jsPsych DataCollection
  // objects.
  const value = Array.isArray(input)
    ? input
    : input && typeof input.values === "function"
      ? input.values()
      : input;
  if (!Array.isArray(value)) {
    throw new TypeError(
      "Study data must be an array or the value returned by jsPsych.data.get().",
    );
  }
  return sanitize(value);
}

const CONDITION_KEYS = new Set([
  "condition",
  "condition_id",
  "condition_code",
  "assigned_condition",
  "assigned_condition_code",
  "experimental_condition",
  "between_condition",
  "launch_condition",
  "order_condition",
  "presentation_order",
  "counterbalance_order",
]);

function normalizedConditionKey(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function collectConditionValues(value, output, depth = 0) {
  if (depth > 12 || value === null || value === undefined) return;
  if (Array.isArray(value)) {
    value.forEach((entry) => collectConditionValues(entry, output, depth + 1));
    return;
  }
  if (typeof value !== "object") return;
  Object.entries(value).forEach(([key, entry]) => {
    if (CONDITION_KEYS.has(normalizedConditionKey(key)) && typeof entry === "string" && entry.trim()) {
      output.add(entry.trim());
    }
    if (entry && typeof entry === "object") collectConditionValues(entry, output, depth + 1);
  });
}

export function verifyObservedCondition(trials, study, expectedCondition) {
  const observed = new Set();
  collectConditionValues(trials, observed);
  const observedConditions = Array.from(observed);
  const required = ["between_participant", "counterbalanced_within_participant"].includes(study.assignmentType)
    && study.integrationMode === "converted";
  if (!required) {
    return { status: "not_required", expectedCondition, observedConditions };
  }
  const registeredObserved = observedConditions.filter((value) => study.conditions.includes(value));
  if (registeredObserved.length === 1) {
    return {
      status: registeredObserved[0] === expectedCondition ? "matched" : "mismatch",
      expectedCondition,
      observedConditions,
    };
  }
  if (registeredObserved.length > 1) {
    return { status: "ambiguous", expectedCondition, observedConditions };
  }
  return {
    status: observedConditions.length ? "mismatch" : "missing",
    expectedCondition,
    observedConditions,
  };
}

function sanitize(value, depth = 0) {
  if (depth > 20) return "[maximum depth reached]";
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (["string", "boolean"].includes(typeof value)) return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => sanitize(item, depth + 1));
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => typeof item !== "function" && typeof item !== "symbol")
        .map(([key, item]) => [key, sanitize(item, depth + 1)]),
    );
  }
  return String(value);
}

function readLaunchContext() {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode") === "sandbox" ? "sandbox" : "production";
  return {
    studyKey: params.get("study") ?? "",
    condition: params.get("condition") ?? "",
    mode,
    preflightToken: params.get("preflight") ?? "",
    participant: {
      prolificPid: params.get("PROLIFIC_PID") ?? "",
      studyId: params.get("STUDY_ID") ?? "",
      sessionId: params.get("SESSION_ID") ?? "",
    },
  };
}

export function pickBalancedCondition(counters, tieBreakers = {}) {
  const candidates = counters
    .filter(
      (counter) =>
        counter &&
        typeof counter.condition === "string" &&
        Number.isInteger(counter.assignedCount) &&
        counter.assignedCount >= 0 &&
        Number.isInteger(counter.target) &&
        counter.target > 0,
    )
    .map((counter) => ({
      ...counter,
      fillRatio: counter.assignedCount / counter.target,
      tieBreaker: Number(tieBreakers[counter.condition] ?? 0),
    }));

  if (!candidates.length) {
    throw new Error("Balanced assignment has not been configured for this study.");
  }

  candidates.sort(
    (left, right) =>
      left.fillRatio - right.fillRatio ||
      left.assignedCount - right.assignedCount ||
      left.tieBreaker - right.tieBreaker ||
      left.condition.localeCompare(right.condition),
  );
  return candidates[0].condition;
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hashFraction(hex) {
  return Number.parseInt(hex.slice(0, 12), 16) / 0xffffffffffff;
}

function counterDocumentId(condition) {
  return encodeURIComponent(condition);
}

function estimateBytes(value) {
  return new Blob([JSON.stringify(value)]).size;
}

async function loadFirebase() {
  const root = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}`;
  const [appModule, authModule, firestoreModule, appCheckModule] = await Promise.all([
    import(`${root}/firebase-app.js`),
    import(`${root}/firebase-auth.js`),
    import(`${root}/firebase-firestore.js`),
    import(`${root}/firebase-app-check.js`),
  ]);
  return { ...appModule, ...authModule, ...firestoreModule, ...appCheckModule };
}

async function deterministicCondition(study, launch) {
  if (!Array.isArray(study.conditions) || !study.conditions.length) {
    throw new Error("This study does not have any registered conditions.");
  }
  const identity =
    launch.participant.sessionId ||
    launch.participant.prolificPid ||
    crypto.randomUUID();
  const digest = await sha256(`${launch.studyKey}:${identity}:condition`);
  return study.conditions[Number.parseInt(digest.slice(0, 8), 16) % study.conditions.length];
}

export async function allocateBalancedCondition(firebase, db, user, launch, study) {
  const identity = launch.participant.sessionId || launch.participant.prolificPid;
  if (!identity) {
    throw new Error("Balanced assignment requires a Prolific participant or session ID.");
  }

  const assignmentId = await sha256(`${launch.studyKey}:${identity}:assignment`);
  const assignmentRef = firebase.doc(
    db,
    "studies",
    launch.studyKey,
    "assignments",
    assignmentId,
  );
  const counterEntries = await Promise.all(
    study.conditions.map(async (condition) => ({
      condition,
      ref: firebase.doc(
        db,
        "publicStudies",
        launch.studyKey,
        "conditionCounters",
        counterDocumentId(condition),
      ),
      tieBreaker: hashFraction(await sha256(`${assignmentId}:${condition}`)),
    })),
  );

  let assignedCondition = "";
  let reused = false;
  await firebase.runTransaction(db, async (transaction) => {
    const existing = await transaction.get(assignmentRef);
    if (existing.exists()) {
      const priorCondition = existing.data().condition;
      if (!study.conditions.includes(priorCondition)) {
        throw new Error("The saved condition assignment is no longer registered.");
      }
      assignedCondition = priorCondition;
      reused = true;
      return;
    }

    const snapshots = await Promise.all(
      counterEntries.map((entry) => transaction.get(entry.ref)),
    );
    const counters = snapshots.map((snapshot, index) => {
      if (!snapshot.exists()) {
        throw new Error(
          `Balanced assignment is not initialized for “${counterEntries[index].condition}”.`,
        );
      }
      return snapshot.data();
    });
    const tieBreakers = Object.fromEntries(
      counterEntries.map((entry) => [entry.condition, entry.tieBreaker]),
    );
    assignedCondition = pickBalancedCondition(counters, tieBreakers);
    const selectedIndex = counterEntries.findIndex(
      (entry) => entry.condition === assignedCondition,
    );
    const selectedCounter = counters[selectedIndex];

    transaction.set(assignmentRef, {
      assignmentId,
      studyId: launch.studyKey,
      condition: assignedCondition,
      counterId: counterDocumentId(assignedCondition),
      authUid: user.uid,
      mode: "production",
      clientVersion: CLIENT_VERSION,
      createdAt: firebase.serverTimestamp(),
    });
    transaction.update(counterEntries[selectedIndex].ref, {
      assignedCount: selectedCounter.assignedCount + 1,
      lastAssignmentId: assignmentId,
      updatedAt: firebase.serverTimestamp(),
    });
  });

  return {
    condition: assignedCondition,
    assignmentId,
    assignmentSource: reused ? "balanced-existing" : "balanced-new",
  };
}

function renderRecovery(error, retry) {
  const previous = document.getElementById("explanation-lab-save-recovery");
  if (previous) previous.remove();

  const layer = document.createElement("div");
  layer.id = "explanation-lab-save-recovery";
  layer.setAttribute("role", "alert");
  layer.style.cssText =
    "position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;padding:24px;background:#f6f7f2;color:#172b2a;font-family:system-ui,sans-serif";
  const card = document.createElement("div");
  card.style.cssText =
    "width:min(520px,100%);padding:30px;border:1px solid #dfe5e1;border-radius:14px;background:#fffefa;box-shadow:0 20px 70px #163b3a22";
  const heading = document.createElement("h1");
  const conditionMismatch = error?.code === "EXPLANATION_LAB_CONDITION_MISMATCH";
  heading.textContent = conditionMismatch
    ? "This study has a configuration problem"
    : "Your responses have not been confirmed yet";
  heading.style.cssText = "margin:0 0 12px;font:500 28px Georgia,serif";
  const copy = document.createElement("p");
  copy.textContent = conditionMismatch
    ? "Your responses could not be safely recorded because the study displayed a different condition from the one assigned by the lab. Please return to Prolific and contact the researcher. Retrying cannot correct this study configuration."
    : "Please keep this page open and try saving again. You will only be returned to Prolific after the lab confirms the save.";
  copy.style.cssText = "margin:0 0 18px;color:#687774;line-height:1.55";
  const detail = document.createElement("p");
  detail.textContent = `Technical detail: ${error?.message ?? "Unknown save error"}`;
  detail.style.cssText = "font-size:11px;color:#8a9692";
  const button = document.createElement("button");
  button.textContent = "Try saving again";
  button.style.cssText =
    "margin-top:8px;padding:11px 16px;border:0;border-radius:8px;background:#143b3a;color:white;font-weight:700;cursor:pointer";
  button.addEventListener("click", async () => {
    button.disabled = true;
    button.textContent = "Saving…";
    await retry();
  });
  card.append(heading, copy, detail);
  if (!conditionMismatch) card.append(button);
  layer.append(card);
  document.body.append(layer);
}

export async function createExplanationLabClient(options = {}) {
  const config = options.config ?? LAB_CONFIG;
  if (!configured(config)) {
    throw new Error(
      "The Explanation Lab Firebase configuration has not been added to the shared study client.",
    );
  }

  const launchFromUrl = readLaunchContext();
  const launch = {
    ...launchFromUrl,
    ...(options.launch ?? {}),
    participant: {
      ...launchFromUrl.participant,
      ...(options.launch?.participant ?? {}),
    },
  };
  launch.studyKey = options.studyKey ?? launch.studyKey;
  if (!launch.studyKey) {
    throw new Error("This launch URL is missing its study key (?study=…).");
  }
  if (
    launch.mode === "production" &&
    (!launch.participant.prolificPid ||
      !launch.participant.studyId ||
      !launch.participant.sessionId)
  ) {
    throw new Error(
      "This production launch is missing one or more Prolific participant identifiers.",
    );
  }

  const firebase = await loadFirebase();
  const app = firebase.getApps().length
    ? firebase.getApp()
    : firebase.initializeApp(config.firebase);

  if (config.appCheckSiteKey && !config.appCheckSiteKey.startsWith("__")) {
    try {
      firebase.initializeAppCheck(app, {
        provider: new firebase.ReCaptchaEnterpriseProvider(config.appCheckSiteKey),
        isTokenAutoRefreshEnabled: true,
      });
    } catch (error) {
      console.warn("Explanation Lab App Check could not initialize.", error);
    }
  }

  const auth = firebase.getAuth(app);
  await firebase.setPersistence(auth, firebase.browserLocalPersistence);
  const user = auth.currentUser ?? (await firebase.signInAnonymously(auth)).user;
  const db = firebase.getFirestore(app);
  const publicStudyRef = firebase.doc(db, "publicStudies", launch.studyKey);
  const publicStudySnapshot = await firebase.getDoc(publicStudyRef);
  if (!publicStudySnapshot.exists()) {
    throw new Error(`Study “${launch.studyKey}” is not registered with the Explanation Lab.`);
  }
  const study = publicStudySnapshot.data();

  if (launch.mode === "production" && study.status !== "live") {
    throw new Error(study.status === "ready"
      ? "The researcher has prepared this study but has not enabled Prolific data collection yet. Please return to Prolific and contact the researcher."
      : "This study is not currently accepting Prolific submissions. Please return to Prolific and contact the researcher.");
  }
  if (launch.mode === "sandbox" && !["draft", "sandbox", "ready", "live"].includes(study.status)) {
    throw new Error("This study is not available for sandbox testing.");
  }
  if (!launch.condition) {
    if (launch.mode === "production" && study.allocationMode === "balanced") {
      Object.assign(
        launch,
        await allocateBalancedCondition(firebase, db, user, launch, study),
      );
    } else {
      launch.condition = await deterministicCondition(study, launch);
      launch.assignmentSource = "deterministic";
    }
  } else {
    launch.assignmentSource = "explicit";
  }
  if (Array.isArray(study.conditions) && !study.conditions.includes(launch.condition)) {
    throw new Error(`Condition “${launch.condition}” is not registered for this study.`);
  }

  async function save(input, saveOptions = {}) {
    const trials = normalizeTrials(input);
    const conditionVerification = verifyObservedCondition(trials, study, launch.condition);
    const preflight = saveOptions.metadata?.preflight === true;
    if (!preflight && !["matched", "not_required"].includes(conditionVerification.status)) {
      const observed = conditionVerification.observedConditions.join(", ") || "no condition code";
      const mismatchError = new Error(
        `Condition verification failed. The Console assigned “${launch.condition}”, but the study recorded ${observed}. No response was saved.`,
      );
      mismatchError.code = "EXPLANATION_LAB_CONDITION_MISMATCH";
      throw mismatchError;
    }
    const serializedBytes = estimateBytes(trials);
    if (serializedBytes > 900_000) {
      throw new Error(
        "This response is too large for one Firestore record. Contact the lab before continuing.",
      );
    }
    const id =
      launch.mode === "sandbox"
        ? `sandbox-${crypto.randomUUID()}`
        : await sha256(`${launch.studyKey}:${launch.participant.prolificPid}`);
    const submissionRef = firebase.doc(db, "studies", launch.studyKey, "submissions", id);

    if (launch.mode === "production") {
      try {
        const existing = await firebase.getDoc(submissionRef);
        if (existing.exists() && existing.data().authUid === user.uid) {
          return { id, duplicate: true, mode: launch.mode, redirectUrl: study.completionUrl };
        }
      } catch {
        // A prior save from another anonymous session remains unreadable and
        // the create-only security rule will safely reject a duplicate write.
      }
    }

    const payload = {
      submissionId: id,
      studyId: launch.studyKey,
      mode: launch.mode,
      condition: launch.condition,
      participant: launch.participant,
      authUid: user.uid,
      itemCount: trials.length,
      durationMs: Number.isFinite(saveOptions.durationMs) ? saveOptions.durationMs : null,
      trials,
      metadata: sanitize({
        ...(saveOptions.metadata ?? {}),
        conditionVerification,
        pageUrl: window.location.href,
        userAgent: navigator.userAgent,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
      serializedBytes,
      clientVersion: CLIENT_VERSION,
      createdAt: firebase.serverTimestamp(),
    };
    await firebase.setDoc(submissionRef, payload);
    return { id, duplicate: false, mode: launch.mode, redirectUrl: study.completionUrl };
  }

  async function submit(input, saveOptions = {}) {
    try {
      return await save(input, saveOptions);
    } catch (error) {
      if (saveOptions.showRetryScreen !== false) {
        renderRecovery(error, async () => {
          try {
            const result = await save(input, saveOptions);
            if (launch.mode === "production") window.location.assign(result.redirectUrl);
            else document.getElementById("explanation-lab-save-recovery")?.remove();
          } catch (retryError) {
            renderRecovery(retryError, () => submit(input, saveOptions));
          }
        });
      }
      throw error;
    }
  }

  async function submitAndRedirect(input, saveOptions = {}) {
    const result = await submit(input, saveOptions);
    if (launch.mode === "production") window.location.assign(result.redirectUrl);
    return result;
  }

  if (launch.mode === "sandbox" && launch.preflightToken) {
    try {
      const result = await save([
        {
          trial_type: "explanation-lab-preflight",
          trial_role: "system",
          preflight: true,
        },
      ], {
        showRetryScreen: false,
        metadata: {
          preflight: true,
          experimentVersion: options.experimentVersion ?? study.experimentVersion ?? "",
        },
      });
      window.opener?.postMessage({
        type: "EXPLANATION_LAB_PREFLIGHT_RESULT",
        token: launch.preflightToken,
        ok: true,
        submissionId: result.id,
        studyKey: launch.studyKey,
        condition: launch.condition,
        clientVersion: CLIENT_VERSION,
        experimentVersion: options.experimentVersion ?? study.experimentVersion ?? "",
      }, "*");
    } catch (error) {
      window.opener?.postMessage({
        type: "EXPLANATION_LAB_PREFLIGHT_RESULT",
        token: launch.preflightToken,
        ok: false,
        studyKey: launch.studyKey,
        message: error?.message ?? "The automated Sandbox save failed.",
      }, "*");
      throw error;
    }
  }

  return Object.freeze({
    study: { key: launch.studyKey, ...study },
    launch,
    submit,
    submitAndRedirect,
    version: CLIENT_VERSION,
  });
}

export default createExplanationLabClient;
