# Causal Verbs Cross-Cultural

English pilots for comparing thick causal verbs with alternating thin verbs.

Implemented pilots are **Pilots/Absences**, **Pilots/Factivity**, and **Pilots/Chains**.

## Open the Absences review

From the repository root, run:

```sh
python3 tools/serve.py --port 8765
```

Open [researcher review](http://127.0.0.1:8765/Pilots/Absences/preview.html).
The [participant entry](http://127.0.0.1:8765/Pilots/Absences/index.html) uses the local allocation and response service.

The [Factivity review](http://127.0.0.1:8765/Pilots/Factivity/preview.html) and [Factivity participant entry](http://127.0.0.1:8765/Pilots/Factivity/index.html) run on the same server with separate assignments and response storage. See [Factivity design and operation notes](Pilots/Factivity/README.md).

The [Chains review](http://127.0.0.1:8765/Pilots/Chains/preview.html) and [Chains participant entry](http://127.0.0.1:8765/Pilots/Chains/index.html) also run on this server with their own assignments and data. See [Chains design and operation notes](Pilots/Chains/README.md).

The preview also works on an ordinary static HTTP server. The participant entry requires `tools/serve.py`; it does not silently collect unsaved responses on static hosting.

This repository is prepared for local review. No recruitment, public hosting, Study Console registration, or production deployment has been configured.

See [the Absences design and operation notes](Pilots/Absences/README.md) for materials, allocation, consent, data, and checks.
