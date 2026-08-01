
import os
import glob
from datetime import datetime
import subprocess

docs_dir = "docs"
output_file = os.path.join(docs_dir, "MASTER-APPLICATION-DOCUMENTATION.md")

def get_git_commit():
    try:
        return subprocess.check_output(["git", "rev-parse", "HEAD"]).decode("utf-8").strip()
    except:
        return "Unknown"

commit = get_git_commit()
now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

files_order = [
    "CURRENT_STATE_REPORT.md",
    "01-overview/project-overview.md",
    "01-overview/business-overview.md",
    "01-overview/technology-stack.md",
    "02-architecture/application-structure.md",
    "02-architecture/system-architecture.md",
    "02-architecture/frontend-architecture.md",
    "02-architecture/backend-architecture.md",
    "02-architecture/data-flow.md",
    "03-features/feature-inventory.md",
    "04-routes/route-inventory.md",
    "05-database/database-overview.md",
    "05-database/tables.md",
    "05-database/relationships.md",
    "05-database/security-policies.md",
    "06-authentication/authentication.md",
    "06-authentication/authorization.md",
    "07-integrations/integrations.md",
    "08-deployment/deployment.md",
    "09-security/security-analysis.md",
    "10-performance/performance-analysis.md",
    "11-testing/testing.md",
    "12-dependencies/dependencies.md",
    "13-future/technical-debt.md"
]

out = []

out.append("# MASTER APPLICATION DOCUMENTATION\n")

out.append("## 1. DOCUMENT CONTROL\n")
out.append("- **Document Title**: Master Application Documentation")
out.append("- **Application Name**: All-Hands (Ideallabs / Signature Global Conferences)")
out.append("- **Documentation Purpose**: Single authoritative source of technical and functional knowledge.")
out.append(f"- **Current Documentation Version**: 1.0")
out.append(f"- **Last Synchronized Date**: {now}")
out.append(f"- **Last Synchronized Commit**: {commit}")
out.append("- **Documentation Status**: Active / Live")
out.append("\n**Source of Truth:**\nThe application source code represents the actual implementation.\nThis document describes the current implementation as accurately as possible.\nIf existing documentation conflicts with the actual implementation: SOURCE CODE > OLD DOCUMENTATION.\n")

def read_file(filepath):
    full_path = os.path.join(docs_dir, filepath)
    if os.path.exists(full_path):
        with open(full_path, "r", encoding="utf-8") as f:
            return f.read()
    return f"*[File not found: {filepath}]*"

def append_section(title, files):
    out.append(f"\n## {title}\n")
    for f in files:
        out.append(f"### Source: {f}\n")
        out.append(read_file(f))
        out.append("\n---\n")

append_section("2. EXECUTIVE APPLICATION OVERVIEW", ["CURRENT_STATE_REPORT.md", "01-overview/project-overview.md"])
append_section("3. BUSINESS DOMAIN", ["01-overview/business-overview.md"])
append_section("4. USER TYPES AND ROLES", ["06-authentication/authorization.md"])
append_section("5. COMPLETE TECHNOLOGY STACK", ["01-overview/technology-stack.md", "12-dependencies/dependencies.md"])
append_section("6. COMPLETE REPOSITORY STRUCTURE", ["02-architecture/application-structure.md"])
append_section("7. APPLICATION ARCHITECTURE", [
    "02-architecture/system-architecture.md", 
    "02-architecture/frontend-architecture.md", 
    "02-architecture/backend-architecture.md", 
    "02-architecture/data-flow.md"
])
append_section("8. DATABASE ARCHITECTURE & SCHEMA", [
    "05-database/database-overview.md",
    "05-database/tables.md",
    "05-database/relationships.md",
    "05-database/security-policies.md"
])
append_section("9. AUTHENTICATION & SECURITY", [
    "06-authentication/authentication.md",
    "09-security/security-analysis.md"
])
append_section("10. FEATURES & ROUTES", [
    "03-features/feature-inventory.md",
    "04-routes/route-inventory.md"
])
append_section("11. INTEGRATIONS & DEPLOYMENT", [
    "07-integrations/integrations.md",
    "08-deployment/deployment.md"
])
append_section("12. PERFORMANCE & TESTING", [
    "10-performance/performance-analysis.md",
    "11-testing/testing.md"
])
append_section("13. TECHNICAL DEBT & FUTURE", [
    "13-future/technical-debt.md"
])

with open(output_file, "w", encoding="utf-8") as f:
    f.write("\n".join(out))

print(f"Master documentation compiled at {output_file} with size {os.path.getsize(output_file)} bytes")

