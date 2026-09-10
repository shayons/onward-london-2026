# Deployed Onward resources

The connected demo uses Isengard account **619763002613**, region **us-east-1**. Exact identifiers are in [deployed.json](deployed.json). This file contains ARNs and IDs, not passwords or session credentials.

| Resource | Name / ID | Ownership |
|---|---|---|
| Aurora PostgreSQL cluster | `meridian-demo` | Existing shared cluster; preserve it and its other databases. |
| Aurora database | `onward` | Isolated Onward tables and pgvector 0.8.1. |
| PostgreSQL reader | `onward_london_2026_reader` | Runtime SELECT access to Onward tables. |
| Secrets Manager secret | `onward/london-2026/database-reader` | Dedicated reader credentials; never expose the value. |
| AgentCore Runtime | `onward_london_2026-Jy18RJFzmb` | Python 3.13 ARM64 code deployment; IAM authentication. |
| AgentCore Memory | `onward_london_2026-daPhExCkem` | Alex's Onward conversations with Semantic, User Preference, Session Summary and Episodic strategies; seven-day event expiry. |
| Neptune Analytics graph | `g-rwi3whrid6` / `onward-london-2026` | Dedicated graph, 16 m-NCUs, zero replicas. |
| S3 bucket | `onward-london-2026-619763002613-us-east-1` | Versioned sources and deployment ZIPs, public access blocked, SSE-S3. |
| IAM role | `OnwardLondon2026Runtime` | Scoped tool access; policy/trust JSON checked in here. |
| CloudWatch log group | `/aws/bedrock-agentcore/runtimes/onward_london_2026-Jy18RJFzmb-DEFAULT` | Structured application events, KMS encryption, seven-day retention. |
| KMS key | `dab78532-7cda-4ab3-88f8-d67b53bc1135` | Onward runtime log encryption. |

The runtime and graph use IAM-authenticated public service connectivity for local development. The UI itself is loopback-only, not publicly hosted. The Bedrock US inference profile may execute model calls in other supported US regions.

## Rebuild or update

Prerequisites: active default AWS credentials in the expected account, Python with boto3 for provisioning, Node.js, and `uv` for the pinned Python environment/package.

```sh
uv venv --python 3.13
uv pip install --python .venv/bin/python -r backend/requirements.lock
.venv/bin/python scripts/provision.py
```

Provisioning reuses the configured shared Aurora cluster and creates only Onward-specific resources. It asserts the expected AWS account. Wait for Neptune **AVAILABLE** and Memory **ACTIVE** before seeding; `seed.py` reports if either is still being created.

```sh
.venv/bin/python scripts/seed.py
uv pip install --python-platform aarch64-manylinux2014 --python-version 3.13 --target .build/package --only-binary=:all: -r backend/requirements.lock
.venv/bin/python scripts/deploy.py
```

The Linux ARM64 package is required for the managed runtime even when developing on macOS. Deploy uploads an immutable S3 object version and creates/updates the runtime's DEFAULT endpoint. Wait for Runtime **READY**, then:

```sh
npm ci
npm start
```

In a second terminal:

```sh
.venv/bin/python scripts/smoke.py
```

For application-only backend edits, `scripts/deploy.py` copies the latest `main.py`, `services.py` and `planner.py` into the already prepared dependency package. For dependency changes, recreate the target package from the lockfile first. Frontend edits need only a browser refresh.

**Seeding is an explicit data reset/upsert operation:** it restores fixture availability, creates new source-object versions, and refreshes embeddings/relationships. Do not run it during a live inventory-change demonstration. It does not delete or reset previously extracted long-term preferences.

The current application is intentionally tied to this account, region and cluster. Reusing these scripts elsewhere requires reviewing the configured ARNs, local proxy account checks and role policy, rather than silently pointing them at another account.

## Inspect and recover

The topbar connection dialog verifies actual readiness. `.local/verification/` holds complete smoke evidence and `.local/runs/` holds received proxy SSE logs. Neither directory is served to browsers. `.impeccable/review/live/VERIFICATION.md` records the tested outcomes.

The runtime uses the database reader secret. Provisioning, seeding and the proxy's fixed AX218 stock action use the existing cluster administrator secret ARN through Data API; they do not retrieve or print the secret value. The model cannot choose that write query or modify other records.

## Resource lifetime and retirement

The **Neptune Analytics graph incurs charges while it runs**. Other retained storage/resources and AWS requests also have their normal service charges. Closing a browser or stopping `npm start` does not remove these resources. No automatic cleanup has been run, so the demo remains available.

After the event, review `deployed.json` and retire only the dedicated Onward resources: runtime/endpoints, Memory, graph, versioned bucket contents and bucket, reader secret/role, isolated `onward` database, runtime IAM role, and log group. Retain logs or source evidence first if needed; remove the log encryption key only after any retained encrypted logs are no longer needed.

**Preserve the shared `meridian-demo` cluster, its administrator secret and every other database. Preserve Counter.** Deleting the shared cluster is not Onward cleanup. Resource deletion is a separate destructive operation; this guide records its scope, it does not execute it.

## Published site (CloudFront)

`scripts/publish.py` is re-runnable and owns the whole published surface:

- **Static origin** — private S3 bucket, all four public-access blocks on, readable only by
  this distribution through an S3 origin access control.
- **API origin** — `onward-london-2026-api`, a Node 22 Lambda with response streaming that
  mirrors `server.mjs`. Its function URL is **`AWS_IAM`**, reachable only by
  `cloudfront.amazonaws.com` scoped to this distribution's ARN via a Lambda OAC.
  Because Lambda rejects unsigned payloads, the browser sends `x-amz-content-sha256`
  with every API call (`api()` in `app.js`).
- **Edge auth** — a CloudFront viewer function enforces HTTP basic auth on every path and
  rewrites the client-side `/prepare` route to `/index.html`.
- **Guard** — `assert_not_public()` fails the publish if the function URL is ever anything
  but `AWS_IAM`, if any resource-policy statement is an unscoped wildcard, or if the bucket
  stops blocking public access.

A first revision used a public (`AuthType=NONE`) function URL and was auto-mitigated by the
account's `lambda_function_policy_block_public_access` control. That path is gone and the
guard exists so it cannot come back silently.

Credentials and identifiers live in `infra/published.json`, which is git-ignored.
