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

data "cloudflare_zone" "main" {
  filter = {
    name = "tuannguyenviet.site"
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
  }]
}

resource "cloudflare_workers_cron_trigger" "uptimeflare_worker_cron" {
  account_id  = var.CLOUDFLARE_ACCOUNT_ID
  script_name = cloudflare_workers_script.uptimeflare_worker.script_name
  schedules = [{
    cron = "* * * * *" # every 1 minute, you can reduce the write counts by increase the worker settings of `kvWriteCooldownMinutes`
  }]
}

resource "cloudflare_pages_project" "uptimeflare" {
  account_id        = var.CLOUDFLARE_ACCOUNT_ID
  name              = "uptimeflare"
  production_branch = "main"

  deployment_configs = {
    # SMH Cloudflare provider will throw an error without preview config
    preview = {
      fail_open = false
    }
    production = {
      d1_databases = {
        UPTIMEFLARE_D1 = {
          id = var.UPTIMEFLARE_D1_ID
        }
      }
      compatibility_date  = "2025-04-02"
      compatibility_flags = ["nodejs_compat"]
      fail_open           = false
    }
  }

  # SMH it will error without this build_config
  build_config = {
    root_dir = "/"
  }
}

resource "cloudflare_dns_record" "status" {
  zone_id = data.cloudflare_zone.main.id
  name    = "status.tuannguyenviet.site"
  type    = "CNAME"
  content = cloudflare_pages_project.uptimeflare.subdomain
  ttl     = 1
  proxied = true
}

resource "cloudflare_pages_domain" "uptimeflare_status" {
  account_id   = var.CLOUDFLARE_ACCOUNT_ID
  project_name = cloudflare_pages_project.uptimeflare.name
  name         = "status.tuannguyenviet.site"

  depends_on = [cloudflare_dns_record.status]
}

resource "cloudflare_list" "pages_redirects" {
  account_id  = var.CLOUDFLARE_ACCOUNT_ID
  name        = "uptimeflare_pages_redirects"
  description = "Redirect the default Pages hostname to the custom status domain."
  kind        = "redirect"

  items = [{
    redirect = {
      source_url             = "https://uptimeflare-1pk.pages.dev"
      target_url             = "https://status.tuannguyenviet.site"
      status_code            = 301
      include_subdomains     = true
      preserve_path_suffix   = true
      preserve_query_string  = true
      subpath_matching       = true
    }
  }]
}

resource "cloudflare_ruleset" "pages_redirects" {
  account_id  = var.CLOUDFLARE_ACCOUNT_ID
  name        = "uptimeflare_pages_redirects"
  description = "Redirect the default Pages hostname to the custom status domain."
  kind        = "root"
  phase       = "http_request_redirect"

  rules {
    action = "redirect"
    action_parameters {
      from_list {
        name = cloudflare_list.pages_redirects.name
        key  = "http.request.full_uri"
      }
    }
    expression  = "http.request.full_uri in $uptimeflare_pages_redirects"
    description = "Redirect uptimeflare-1pk.pages.dev to status.tuannguyenviet.site."
    enabled     = true
  }

  depends_on = [cloudflare_list.pages_redirects]
}
