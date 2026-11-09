# Adventure page override

P0 battle and share posters use MASTER token **names** with cream Maple **values** from `apps/web-demo/src/index.css` `.theme-light`. Map and squad layouts stay on the P1 list and are not part of this override.

| Token | Value | Use |
| --- | --- | --- |
| `--color-background` | `#FAF6F0` | Shell behind the skill deck |
| `--color-card` | `#FFFFFF` | Cards |
| `--color-muted` | `#EFE8DC` | Unselected skill orb |
| `--color-border` | `#E5DCCB` | Borders |
| `--color-foreground` | `#29221E` | Primary text |
| `--color-muted-foreground` | `#786B63` | Secondary text |
| `--color-primary` | `#F97316` | Stage pill, active mode |
| `--color-on-primary` | `#0F172A` | Text on primary |
| `--color-secondary` | `#F59E0B` | Coins, crit number |
| `--color-accent` | `#10B981` | Strike when ready |
| `--color-on-accent` | `#0F172A` | Text on accent |
| `--color-destructive` | `#F43F5E` | Damage number |
| Arena gradient | `#FFF8EC` to `#F5E6C8` | Battle canvas. Not `game-stage-dark`. |
| HP fill | `#F97316` to `#F59E0B` | Boss HP bar, 18px |
| Card shadow | `0 4px 0 #D8CCB8` | Tactile retro shadow |

Battle canvas height is `100dvh - TopHeader - BottomNav - 120px` skill deck. The live shell subtracts the real header and nav; the raid pane reserves the 120px deck.

Share posters export `1080x1920` (default) and `1080x1350`. The brand watermark is always drawn and cannot be turned off: lightning mark, brand name, level, and nickname.
