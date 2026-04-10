# PadelFlow - Data Model

## Entity Relationship Summary

```
profiles ──┬── clubs (created_by)
            ├── tournaments (organizer_id)
            ├── tournament_memberships (user_id)
            ├── tournament_registrations (user_id)
            ├── invitations (created_by, accepted_by)
            ├── team_members (user_id)
            ├── match_result_proposals (proposed_by)
            ├── match_result_validations (validator_id)
            ├── notifications (user_id)
            └── audit_log (actor_id)

tournaments ──┬── tournament_rules (1:1)
              ├── tournament_memberships
              ├── tournament_registrations
              ├── invitations
              ├── stages (phases)
              ├── rounds
              ├── teams
              └── matches

stages ──┬── groups
         ├── rounds
         └── matches

matches ──┬── match_sides (home/away)
          ├── match_result_proposals
          └── score_submissions (legacy)

match_result_proposals ── match_result_validations
```

## Tables

| Table | Purpose |
|-------|---------|
| profiles | User identity, level, hand, city |
| clubs | Optional community grouping |
| tournaments | Tournament header with format, pair_mode, status |
| tournament_rules | Frozen scoring rules per tournament |
| tournament_memberships | User roles within tournament |
| tournament_registrations | Formal inscription tracking |
| invitations | Token-based invitations with expiry |
| stages | Tournament phases (groups, knockout) |
| groups | Groups within a stage |
| rounds | Jornadas/rounds within a stage |
| teams | Fixed pairs |
| team_members | Players in each team |
| matches | Individual matches with rich status |
| match_sides | Home/away sides per match |
| match_result_proposals | Player-proposed results |
| match_result_validations | Accept/reject decisions on proposals |
| score_submissions | Legacy organizer-reviewed scores |
| standings | Calculated rankings per stage/group |
| notifications | In-app notification delivery |
| audit_log | Sensitive action traceability |

## Key Statuses

- **Tournament**: draft, published, in_progress, completed, cancelled
- **Match**: draft, scheduled, pending, result_proposed, in_validation, in_dispute, pending_review, validated, closed
- **Invitation**: pending, accepted, revoked, expired, rejected
- **Registration**: pending, confirmed, voluntary_withdrawal, expelled
- **Proposal**: pending, accepted, rejected, overridden
