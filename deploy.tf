terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5"
    }
  }
}

provider "cloudflare" {
  # read token from $CLOUDFLARE_API_TOKEN
}

variable "CLOUDFLARE_ACCOUNT_ID" {
  # read account id from $TF_VAR_CLOUDFLARE_ACCOUNT_ID
  type = string
}

variable "enable_do_migration" {
  type    = bool
  default = false
}

variable "UPTIMEFLARE_D1_ID" {
  type = string
}

variable "CF_ACCESS_CLIENT_ID" {
  type      = string
  sensitive = true
  validation {
    condition     = length(trimspace(var.CF_ACCESS_CLIENT_ID)) > 0
    error_message = "CF_ACCESS_CLIENT_ID is required."
  }
}

variable "CF_ACCESS_CLIENT_SECRET" {
  type      = string
  sensitive = true
  validation {
    condition     = length(trimspace(var.CF_ACCESS_CLIENT_SECRET)) > 0
    error_message = "CF_ACCESS_CLIENT_SECRET is required."
  }
}

variable "BESZEL_ACCESS_CLIENT_ID" {
  type      = string
  sensitive = true
}

variable "BESZEL_ACCESS_CLIENT_SECRET" {
  type      = string
  sensitive = true
}
variable "TELEGRAM_BOT_TOKEN" {
  type      = string
  sensitive = true
  validation {
    condition     = length(trimspace(var.TELEGRAM_BOT_TOKEN)) > 0
    error_message = "TELEGRAM_BOT_TOKEN is required."
  }
}

variable "TELEGRAM_CHAT_ID" {
  type      = string
  sensitive = true
  validation {
    condition     = length(trimspace(var.TELEGRAM_CHAT_ID)) > 0
    error_message = "TELEGRAM_CHAT_ID is required."
  }
}


resource "cloudflare_workers_script" "uptimeflare_worker" {
  account_id          = var.CLOUDFLARE_ACCOUNT_ID
  script_name         = "uptimeflare_worker"
  main_module         = "worker/dist/index.js"
  content_file        = "worker/dist/index.js"
  content_sha256      = filesha256("worker/dist/index.js")
  compatibility_date  = "2025-04-02"
  compatibility_flags = ["nodejs_compat"]

  observability = {
    enabled = true
    logs = {
      enabled         = true
      invocation_logs = true
    }
  }

  migrations = var.enable_do_migration ? {
    new_tag            = "v1"
    new_sqlite_classes = ["RemoteChecker"]
  } : null

  bindings = [{
    name       = "REMOTE_CHECKER_DO"
    class_name = "RemoteChecker"
    type       = "durable_object_namespace"
    }, {
    name = "UPTIMEFLARE_D1"
    type = "d1"
    id   = var.UPTIMEFLARE_D1_ID
    }, {
    name = "CF_ACCESS_CLIENT_ID"
    type = "secret_text"
    text = var.CF_ACCESS_CLIENT_ID
    }, {
    name = "CF_ACCESS_CLIENT_SECRET"
    type = "secret_text"
    text = var.CF_ACCESS_CLIENT_SECRET
    }, {
    name = "BESZEL_ACCESS_CLIENT_ID"
    type = "secret_text"
    text = var.BESZEL_ACCESS_CLIENT_ID
    }, {
    name = "BESZEL_ACCESS_CLIENT_SECRET"
    type = "secret_text"
    text = var.BESZEL_ACCESS_CLIENT_SECRET
    }, {
    name = "TELEGRAM_BOT_TOKEN"
    type = "secret_text"
    text = var.TELEGRAM_BOT_TOKEN
    }, {
    name = "TELEGRAM_CHAT_ID"
    type = "secret_text"
    text = var.TELEGRAM_CHAT_ID
  }]

}

resource "cloudflare_workers_cron_trigger" "uptimeflare_worker_cron" {
  account_id  = var.CLOUDFLARE_ACCOUNT_ID
  script_name = cloudflare_workers_script.uptimeflare_worker.script_name
  schedules = [{
    cron = "* * * * *" # every 1 minute, you can reduce the write counts by increase the worker settings of `kvWriteCooldownMinutes`
  }]
}


