import json
import sys

def main():
    plan_path = sys.argv[1] if len(sys.argv) > 1 else 'tfplan.json'
    with open(plan_path, 'r', encoding='utf-8') as f:
        plan = json.load(f)

    forbidden = {'delete', 'replace'}
    for rc in plan.get('resource_changes', []):
        actions = set(rc.get('change', {}).get('actions', []))
        if actions & forbidden:
            print(f"FORBIDDEN DESTRUCTIVE ACTION on {rc.get('address')}: {actions}", file=sys.stderr)
            sys.exit(1)

    print("Plan validated: no destructive changes to monitoring infrastructure.")

if __name__ == '__main__':
    main()
