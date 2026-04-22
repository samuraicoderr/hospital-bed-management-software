.PHONY: fail2ban-install fail2ban-start fail2ban-status fail2ban-jail-status fail2ban-logs fail2ban-restart

# Install Fail2Ban and dependencies
fail2ban-install:
	sudo apt-get update
	sudo apt-get install -y fail2ban

# Enable and start the Fail2Ban service
fail2ban-start:
	sudo systemctl enable fail2ban
	sudo systemctl start fail2ban

# Show systemd status of Fail2Ban
fail2ban-status:
	sudo systemctl status fail2ban

# Show active jails and SSH jail details
fail2ban-jail-status:
	sudo fail2ban-client status
	sudo fail2ban-client status sshd

# Tail the Fail2Ban log
fail2ban-logs:
	sudo tail -f /var/log/fail2ban.log

# Restart the Fail2Ban service
fail2ban-restart:
	sudo systemctl restart fail2ban

fail2ban-bantime:
	sudo fail2ban-client get sshd bantime
