# Security Specification (TDD) - Gestão e Controle de Amostras

## 1. Data Invariants
1. **Corporate Domain Lockdown**: Authentication and database document modifications are strictly locked to users with checked Google auth tokens verifying email ending with `@jcruzeiro.com` and `email_verified == true`.
2. **Access Control (RBAC)**: Only profiles stored in the `/usuarios/{userId}` collection dictate actual roles. No client-side token claim overrides are trusted.
3. **Inventory Traceability**: No physical sample stock changes can occur without a corresponding logged `MovimentacaoEstoque` audit trace.
4. **No Negative Inventories**: No reduction can bring the `saldoAtual` below `0`.
5. **No Blind Shipments**: Budget allocations (`verbaCompra`) are conditionally enforced for all requests originating from "Estoque da empresa". Direct factory items are exempt.

## 2. The "Dirty Dozen" Payloads (Denial Proofing)
The following payloads describe illegal data submissions that J. Cruzeiro's system boundaries must aggressively reject:

1. **Self-Elevated Status Attack**: A `Gerente` user tries to set the solicitation status to `Concluída` or `Liberada para separação`.
2. **Outside Domain Auth Spoofing**: An authenticated email `attacker@external.com` attempts to create a document in `/usuarios`.
3. **Negative Stock Insertion**: A `Separador` tries to insert a sample with `saldoAtual: -5`.
4. **Unallocated Budget Theft**: Creating a request whose origin is "Estoque da empresa" but with `verbaCompra: ""` or null.
5. **System Log Hijacking**: Non-admin users writing directly to `/logsAuditoria`.
6. **Double-Spend Stock Modification**: Modifying logs of static registrations `MovimentacaoEstoque` that have already occurred.
7. **Identity Impersonation Writ**: User `Ivan` (Controlador) tries to update a profile `Guilherme` to change their role to `Admin`.
8. **Malicious ID Injection**: Injecting a massive string with junk characters as a sample document ID (`/amostras/XSS_ATTACK_STRING_1MB_...`).
9. **No Photo Proof Hack**: Submitting an active store exhibition proof with `fotos: []` array or blank values.
10. **Avaria Status Override**: A non-authorized store worker trying to validate or bypass `status: "Acompanhada"`.
11. **Monthly Audit Backdate**: Submitting a response after the 5th business day of the month has elapsed without Admin waiver.
12. **Blank Stock Adjustment Exploit**: Adjusting stock levels with `observacoes: ""` when updating database figures manually.

## 3. The Test Runner Structure (`firestore.rules.test.ts`)
A formal definition of testing assertions compiled below:

```typescript
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';

describe('Firestore Security Rules Test Group', () => {
  it('Should reject any reading/writing for unverified external domains', async () => {
    // Setup test environment with email outside of @jcruzeiro.com
    const testEnv = await initializeTestEnvironment({ projectId: 'jcruzeiro-samples' });
    const context = testEnv.authenticatedContext('unauthorized_user', {
      email: 'hacker@gmail.com',
      email_verified: true
    });
    const db = context.firestore();
    
    // Attempt unauthorized read on samples
    await assertFails(db.doc('amostras/sample1').get());
  });
});
```
