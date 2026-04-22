
from django.urls import path, include

from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework.routers import DefaultRouter



def tag_viewset(viewset_class, tag_name):
    """Apply Spectacular tags to all actions in a ViewSet."""
    actions = ["list", "create", "retrieve", "update", "partial_update", "destroy"]

    schema_kwargs = {a: extend_schema(tags=[tag_name]) for a in actions}
    viewset_class = extend_schema_view(**schema_kwargs)(viewset_class)

    # Handle @action-decorated custom methods
    for method_name in dir(viewset_class):
        method = getattr(viewset_class, method_name)
        if hasattr(method, "mapping"):  # identifies @action methods
            decorated = extend_schema(tags=[tag_name])
            viewset_class = extend_schema_view(**{method_name: decorated})(
                viewset_class
            )

    return viewset_class


def tag_router(router, tag_name):
    """Tags all viewsets in a router"""
    new_registry = []
    for prefix, viewset, basename in router.registry:
        tagged_viewset = tag_viewset(viewset, tag_name)
        new_registry.append((prefix, tagged_viewset, basename))
    router.registry = new_registry
    return router


def super_lazy_path(path_name, sub_routers, use_tag_as_default_namespace=False):
    """Dynamically include multiple routers under a common path with optional tagging and namespacing.


    >>> sub_routers = [
    ...     [users_router, "user"],
    ...     [files_router, "files"],
    ... ]
    >>> urlpatterns = [
    ...     *super_lazy_path("api/v1/", sub_routers, use_tag_as_default_namespace=True)
    ... ] 

    Is the same as
    >>> urlpatterns = [
    ...     path("api/v1/", include((users_router.urls, "user"))),
    ...     path("api/v1/", include((files_router.urls, "files"))),
    ... ]

    Args:
        use_tag_as_default_namespace: If True, the tag will also be used as the default namespace for the included router.
    
    """
    router = DefaultRouter()
    namespaced_tagged_routes = [
        # (_tagged_sub_router, _namespace),
    ]

    for r in sub_routers:
        _router = r[0]
        _tag = r[1]
        _namespace = r[2] if len(r) > 2 else (_tag if use_tag_as_default_namespace else None)
        _tagged_sub_router = tag_router(_router, _tag)
        if _namespace:
            namespaced_tagged_routes.append(
                (_tagged_sub_router, _namespace)
            )
        else:
            router.registry.extend(_tagged_sub_router.registry)
            
    path_name = path_name.strip("/")
    urlpatterns = [
        path(f"{path_name}/", include(router.urls)),
        *[
            path(f"{path_name}/", include((r.urls, ns)))
            for r, ns in namespaced_tagged_routes
        ],
    ]
    return urlpatterns

