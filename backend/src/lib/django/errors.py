from rest_framework.exceptions import APIException


class DeprecatedError(APIException):
    status_code = 410
    default_detail = "This endpoint has been deprecated and is no longer available."
    default_code = "deprecated_endpoint"