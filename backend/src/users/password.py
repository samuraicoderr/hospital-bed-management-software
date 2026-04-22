import re
import inspect

class PasswordError(ValueError):
    pass


class PasswordValidator:

    MIN_PASSOWRD_LENGTH = 3
    MAX_PASSWORD_LENGTH = 20
    COMMON_PASSWORDS = ['password', ]

    # error messages
    has_correct_length_msg = 'Password too short must be at least {min_len} long.'
    is_not_common_msg = 'Password too common'
    has_uppercase_letter_msg = 'No uppercase letter found in password'
    has_lowercase_letter_msg = 'No lowercase letter found in password'
    has_digit_msg = 'No digits found in password'
    has_special_characters_msg = 'No special character found in password'

    def __init__(self, password):
        self.password = password
        self.validators = self._get_validators()
        self.errors = {}

    def _get_validators(self):
        validator_methods = []

        for attr in dir(self):
            actual_attr = getattr(self, attr)
            if attr.startswith('do_') and callable(actual_attr):
                validator_methods.append(actual_attr)

        return validator_methods

    def _get_error_msg(self, msg, *a, **kw):
        return getattr(self, msg+'_msg', 'UNDETTERMINED ISSUE WITHI THIS PASSWORD').format(*a, **kw)


    def run_check(self):
        self.errors.clear()
        NO_ERRORS = True
        for checker in self.validators:
            error_key = checker.__name__[3:]   # remove the `do_` part
            try:
                checker()
                self.errors[error_key] = ('Passed', '')
            except PasswordError as ex:
                self.errors[error_key] = ('Failed', str(ex))
                NO_ERRORS = False
        return NO_ERRORS

    ##################################################################################################################################
    # errors #########################################################################################################################

    def do_has_correct_length(self):
        error_name = (inspect.currentframe().f_code.co_name)[3:] # remove the `do_` part from the function name
        error_msg = self._get_error_msg(error_name, min_len=self.MIN_PASSOWRD_LENGTH)  

        if len(self.password) < self.MIN_PASSOWRD_LENGTH:
            raise PasswordError(error_msg)
    
        if len(self.password) > self.MAX_PASSWORD_LENGTH:
            raise PasswordError(f"Password too long must be at most {self.MAX_PASSWORD_LENGTH} long.")


    def do_is_not_common(self):
        error_name = (inspect.currentframe().f_code.co_name)[3:] # remove the `do_` part from the function name
        error_msg = self._get_error_msg(error_name)  

        if self.password.lower() in self.COMMON_PASSWORDS:
            raise PasswordError(error_msg)


    def do_has_uppercase_letter(self):
        error_name = (inspect.currentframe().f_code.co_name)[3:] # remove the `do_` part from the function name
        error_msg = self._get_error_msg(error_name)  

        if not re.search(r"[A-Z]", self.password):
            raise PasswordError(error_msg)        

    def do_has_lowercase_letter(self):
        error_name = (inspect.currentframe().f_code.co_name)[3:] # remove the `do_` part from the function name
        error_msg = self._get_error_msg(error_name)  

        if not re.search(r"[a-z]", self.password):
            raise PasswordError(error_msg)        

    def do_has_digit(self):
        error_name = (inspect.currentframe().f_code.co_name)[3:] # remove the `do_` part from the function name
        error_msg = self._get_error_msg(error_name)  

        if not re.search(r"\d", self.password):
            raise PasswordError(error_msg)        

    def do_has_special_characters(self):
        error_name = (inspect.currentframe().f_code.co_name)[3:] # remove the `do_` part from the function name
        error_msg = self._get_error_msg(error_name)  

        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", self.password):
            raise PasswordError(error_msg)        
