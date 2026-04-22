.PHONY: whoishere whowashere whoistrying whoisinjail


whoishere:
	@echo "==> Current Users Logged In: 👀"
	who

whowashere:
	@echo "==> SSH Logins (Accepted Passwords): 👀"
	grep 'Accepted' /var/log/auth.log

whoistrying:
	@echo "==> SSH Login Attempts (Failed Passwords): 👀"
	grep 'Failed password' /var/log/auth.log

whoisinjail:
	@echo "==> Fail2Ban Overall Status: 👀"
	sudo fail2ban-client status
	@echo ""
	@echo "==> SSH Jail Status: 👀"
	sudo fail2ban-client status sshd

whoisban:
	@echo "==> Banned IPs: 👀"
	zgrep 'Ban' /var/log/fail2ban.log*


restart-ssh:
	@echo "==> Restarting SSH Service"
	sudo systemctl restart ssh


is-ssh-dumb:
	@echo "==> Checking if SSH is configured to allow password authentication"
	sshd -T | grep passwordauthentication


ssh-dumbness:
	@echo "==> 🔍 Evaluating SSH Dumbness:"
	@echo ""
	@echo "🔐 passwordauthentication (should be 'no')"
	@sshd -T | grep -i '^passwordauthentication' || echo "    ⚠️  Not set"
	@echo ""
	@echo "👑 permitrootlogin (should be 'no' or 'prohibit-password')"
	@sshd -T | grep -i '^permitrootlogin' || echo "    ⚠️  Not set"
	@echo ""
	@echo "❌ permitemptypasswords (should be 'no')"
	@sshd -T | grep -i '^permitemptypasswords' || echo "    ⚠️  Not set"
	@echo ""
	@echo "🔁 maxauthtries (should be <= 3)"
	@sshd -T | grep -i '^maxauthtries' || echo "    ⚠️  Not set"
	@echo ""
	@echo "⏱️  logingracetime (should be <= 30s)"
	@sshd -T | grep -i '^logingracetime' || echo "    ⚠️  Not set"
	@echo ""
	@echo "🛂 Checking if Fail2Ban is running..."
	@systemctl is-active fail2ban >/dev/null && echo "✅ Fail2Ban is active" || echo "❌ Fail2Ban is NOT active"
	@echo ""
	@echo "🌐 Is port 22 exposed?"
	@ss -tuln | grep ':22' || echo "✅ Port 22 is not listening"
