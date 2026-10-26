package de.joancode.lanis

import org.junit.Assert.*
import org.junit.Test

class AppLockSessionTest {
    @Test fun coldStartAndRecreationRequireAuthentication() {
        val session = AppLockSession(true)
        assertTrue(session.concealed)
        session.resume()
        assertTrue(session.locked)
        session.succeed()
        assertFalse(session.concealed)
        val recreated = AppLockSession(true)
        recreated.resume()
        assertTrue(recreated.concealed)
    }

    @Test fun leavingTheAppConcealsImmediatelyAndRequiresVerificationOnReturn() {
        val session = AppLockSession(true)
        session.resume(); session.succeed()
        session.pause()
        assertTrue(session.concealed)
        session.resume()
        assertTrue(session.concealed)
    }

    @Test fun credentialActivityCannotRevealContentWhileAppIsBackgrounded() {
        val session = AppLockSession(true)
        session.resume(); session.prompting = true
        session.pause(); session.succeed()
        assertTrue(session.concealed)
        session.resume()
        assertFalse(session.concealed)
    }

    @Test fun cancellationNeverUnlocksAndRetryCanSucceed() {
        val session = AppLockSession(true)
        session.resume(); session.prompting = true; session.fail()
        assertTrue(session.concealed)
        assertFalse(session.prompting)
        session.prompting = true; session.succeed()
        assertFalse(session.concealed)
    }

    @Test fun disabledLockDoesNotBlockStartupOrResume() {
        val session = AppLockSession(false)
        assertFalse(session.concealed)
        session.resume(); session.pause(); session.resume()
        assertFalse(session.locked)
        assertFalse(session.concealed)
    }
}
