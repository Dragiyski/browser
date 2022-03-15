#include <v8.h>
#include <node.h>
#include "js-helper.h"

void js_callback_native_function(const v8::FunctionCallbackInfo<v8::Value>& info) {
    auto isolate = info.GetIsolate();
    v8::EscapableHandleScope scope(isolate);
    auto context = isolate->GetCurrentContext();
    auto undefined = v8::Undefined(isolate);

    v8::Local<v8::Array> binding = info.Data().As<v8::Array>();
    JS_EXECUTE_RETURN_HANDLE(NOTHING, v8::Value, value_platform, binding->Get(context, 0));
    JS_EXECUTE_RETURN_HANDLE(NOTHING, v8::Value, value_callee, binding->Get(context, 1));
    v8::Local<v8::Object> platform = value_platform.As<v8::Object>();
    v8::Local<v8::Function> callee = value_callee.As<v8::Function>();
    v8::Local<v8::Value> native_arguments[info.Length()];
    for (int i = 0; i < info.Length(); ++i) {
        native_arguments[i] = info[i];
    }
    v8::Local<v8::Array> arguments = v8::Array::New(isolate, native_arguments, info.Length());
    v8::Local<v8::Value> callee_arguments[] = { platform, info.This(), arguments, info.NewTarget() };
    JS_EXECUTE_RETURN_HANDLE(NOTHING, v8::Context, callee_context, callee->GetCreationContext());
    JS_EXECUTE_RETURN_HANDLE(NOTHING, v8::Value, return_value, callee->Call(callee_context, undefined, 4, callee_arguments));
    info.GetReturnValue().Set(return_value);
}

/**
 * @brief Create a function within the platform's context that calls another function in its own context.
 *
 * info[0] = platform;
 * info[1] = function(platform, this, arguments, newTarget);
 * info[2] = name?
 * info[3] = is constructor behavior allowed
 *
 * The returned function will call info[1] when the function is called.
 * 
 * @todo
 * 
 * Instead of handling before/after/catch/finally in the C++ code, we can just let the function handle it.
 * 
 * In this case platform function will give as callback something like this:
 * ```javascript
 * function makeNativeFunctionCallback(..., callback, ...) {
 *   return function(platform, self, args, target) {
 *     callback(...);
 *   }
 * }
 * ```
 * This no complex processing is required in C++. We do not even need to catch exceptions, as this will be handled by
 * the try/catch/finally block in javascript.
 * 
 * In this case the C++ ensures:
 * 1. The function is created within the platform's context (i.e. instanceof Function with the platform.global, not the current global);
 * 2. Makes the function "native" (i.e. no source code available);
 * 3. If required, it will prevent using "new" generating a property TypeError message we cannot generate ourself*
 * 
 * * The message is "<token> is not a constructor" where the <token> is the string representation of the AST callee element of the call.
 * 
 * Everything else can be handled in javascript. We can create a callback, that calls into the platform like:
 * platform.executeNative(...)
 * 
 * where am executeNative can be a property changed when the platform is locked/unlocked,
 * with the first unlock mode, switch to:
 * try {
 *   ...
 * } catch(e) {
 *   ... check for current context exceptions, especially direct instances of the native JS exceptions like ReferenceError, TypeError, etc,
 *   and replace those exception with eqivalent from the platform's context...
 * } finally {
 *   ...
 * }
 * but if the platform is unlocked, then:
 * 
 *
 * @param info
 */
void js_platform_native_function(const v8::FunctionCallbackInfo<v8::Value>& info) {
    auto isolate = info.GetIsolate();
    v8::EscapableHandleScope scope(isolate);
    auto context = isolate->GetCurrentContext();

    auto platform = info[0].As<v8::Object>();
    auto callee = info[1].As<v8::Function>();
    auto name = info[2];
    bool is_constructor = info[3]->BooleanValue(isolate);
    JS_EXECUTE_RETURN(NOTHING, int32_t, length, info[4]->Int32Value(context));

    JS_OBJECT_STRING_GET(NOTHING, v8::Value, value_global, context, platform, "global");
    v8::Local<v8::Context> context_platform;
    if (value_global->IsObject()) {
        JS_EXECUTE_RETURN_HANDLE(NOTHING, v8::Context, ctx, value_global.As<v8::Object>()->GetCreationContext());
        context_platform = ctx;
    } else {
        JS_EXECUTE_RETURN_HANDLE(NOTHING, v8::Context, ctx, platform->GetCreationContext());
        context_platform = ctx;
    }

    v8::ConstructorBehavior constructor_behavior = is_constructor ? v8::ConstructorBehavior::kAllow : v8::ConstructorBehavior::kThrow;

    v8::Local<v8::Value> binding_native[] = { platform, callee };
    v8::Local<v8::Array> binding = v8::Array::New(isolate, binding_native, 2);
    JS_EXECUTE_RETURN_HANDLE(NOTHING, v8::Function, native, v8::Function::New(context_platform, js_callback_native_function, binding, length, constructor_behavior));
    if (name->IsString()) {
        native->SetName(name.As<v8::String>());
    }
    info.GetReturnValue().Set(scope.Escape(native));
}

void js_get_security_token(const v8::FunctionCallbackInfo<v8::Value>& info) {
    auto isolate = info.GetIsolate();
    v8::HandleScope scope(isolate);
    auto context = isolate->GetCurrentContext();
    if (info.Length() < 1) {
        JS_THROW_INVALID_ARG_COUNT(NOTHING, context, info, 1);
    }
    if (!info[0]->IsObject()) {
        JS_THROW_INVALID_ARG_TYPE(NOTHING, context, info, 0, "#<object>");
    }
    auto object = info[0].As<v8::Object>();
    JS_EXECUTE_RETURN_HANDLE(NOTHING, v8::Context, object_context, object->GetCreationContext());
    auto security_token = object_context->GetSecurityToken();
    info.GetReturnValue().Set(security_token);
}

void js_set_security_token(const v8::FunctionCallbackInfo<v8::Value>& info) {
    auto isolate = info.GetIsolate();
    v8::HandleScope scope(isolate);
    auto context = isolate->GetCurrentContext();
    if (info.Length() < 2) {
        JS_THROW_INVALID_ARG_COUNT(NOTHING, context, info, 2);
    }
    if (!info[0]->IsObject()) {
        JS_THROW_INVALID_ARG_TYPE(NOTHING, context, info, 0, "#<object>");
    }
    auto object = info[0].As<v8::Object>();
    JS_EXECUTE_RETURN_HANDLE(NOTHING, v8::Context, object_context, object->GetCreationContext());
    auto security_token = object_context->GetSecurityToken();
    info.GetReturnValue().Set(security_token);
    object_context->SetSecurityToken(info[1]);
}

void js_use_default_security_token(const v8::FunctionCallbackInfo<v8::Value>& info) {
    auto isolate = info.GetIsolate();
    v8::HandleScope scope(isolate);
    auto context = isolate->GetCurrentContext();
    if (info.Length() < 1) {
        JS_THROW_INVALID_ARG_COUNT(NOTHING, context, info, 1);
    }
    if (!info[0]->IsObject()) {
        JS_THROW_INVALID_ARG_TYPE(NOTHING, context, info, 0, "#<object>");
    }
    auto object = info[0].As<v8::Object>();
    JS_EXECUTE_RETURN_HANDLE(NOTHING, v8::Context, object_context, object->GetCreationContext());
    auto security_token = object_context->GetSecurityToken();
    info.GetReturnValue().Set(security_token);
    object_context->UseDefaultSecurityToken();
}

void js_platform_lazy_data_property_getter(v8::Local<v8::Name> name, const v8::PropertyCallbackInfo<v8::Value>& info) {
    auto isolate = info.GetIsolate();
    v8::EscapableHandleScope scope(isolate);
    auto context = isolate->GetCurrentContext();
    auto binding = info.Data().As<v8::Array>();
    auto undefined = v8::Undefined(isolate);

    JS_EXECUTE_RETURN_HANDLE(NOTHING, v8::Value, value_platform, binding->Get(context, 0));
    JS_EXECUTE_RETURN_HANDLE(NOTHING, v8::Value, value_callee, binding->Get(context, 1));
    auto platform = value_platform.As<v8::Object>();
    auto callee = value_callee.As<v8::Function>();

    JS_EXECUTE_RETURN_HANDLE(NOTHING, v8::Context, context_callee, callee->GetCreationContext());
    auto is_strict = v8::Boolean::New(isolate, info.ShouldThrowOnError());

    v8::Local<v8::Value> callback_arguments[] = { platform, info.This(), name, is_strict };
    JS_EXECUTE_RETURN_HANDLE(NOTHING, v8::Value, return_value, callee->Call(context_callee, undefined, 4, callback_arguments));
    info.GetReturnValue().Set(scope.Escape(return_value));
}

void js_platform_lazy_data_property(const v8::FunctionCallbackInfo<v8::Value>& info) {
    auto isolate = info.GetIsolate();
    v8::HandleScope scope(isolate);
    auto context = isolate->GetCurrentContext();

    auto platform = info[0].As<v8::Object>();
    auto receiver = info[1].As<v8::Object>();
    auto name = info[2].As<v8::Name>();
    JS_EXECUTE_RETURN(NOTHING, uint32_t, flags, info[3]->Uint32Value(context));
    auto getter = info[4].As<v8::Function>();

    JS_OBJECT_STRING_GET(NOTHING, v8::Object, global, context, platform, "global");
    JS_EXECUTE_RETURN_HANDLE(NOTHING, v8::Context, context_platform, global->GetCreationContext());

    v8::Local<v8::Value> binding_values[] = { platform, getter };
    auto binding = v8::Array::New(isolate, binding_values, 2);

    v8::PropertyAttribute attribute = v8::PropertyAttribute::None;

    if (flags & 1) {
        attribute = static_cast<v8::PropertyAttribute>(attribute | v8::PropertyAttribute::DontDelete);
    }
    if (flags & 2) {
        attribute = static_cast<v8::PropertyAttribute>(attribute | v8::PropertyAttribute::DontEnum);
    }
    if (flags & 4) {
        attribute = static_cast<v8::PropertyAttribute>(attribute | v8::PropertyAttribute::ReadOnly);
    }

    JS_EXECUTE_IGNORE(NOTHING, receiver->SetLazyDataProperty(context_platform, name, js_platform_lazy_data_property_getter, binding, attribute));
}

void js_get_creation_context_global(const v8::FunctionCallbackInfo<v8::Value>& info) {
    auto isolate = info.GetIsolate();
    v8::EscapableHandleScope scope(isolate);

    if (!info[0]->IsObject()) {
        info.GetReturnValue().SetNull();
        return;
    }
    auto object = info[0].As<v8::Object>();
    JS_EXECUTE_RETURN_HANDLE(NOTHING, v8::Context, return_context, object->GetCreationContext());
    info.GetReturnValue().Set(return_context->Global());
}

NODE_MODULE_INIT() {
    {
        JS_EXECUTE_RETURN_HANDLE(NOTHING, v8::String, name, ToString(context, "getSecurityToken"));
        JS_EXECUTE_RETURN_HANDLE(NOTHING, v8::Function, value, v8::Function::New(context, js_get_security_token, exports, 1, v8::ConstructorBehavior::kThrow));
        JS_EXECUTE_IGNORE(NOTHING, exports->DefineOwnProperty(context, name, value, JS_PROPERTY_ATTRIBUTE_FROZEN));
    }
    {
        JS_EXECUTE_RETURN_HANDLE(NOTHING, v8::String, name, ToString(context, "setSecurityToken"));
        JS_EXECUTE_RETURN_HANDLE(NOTHING, v8::Function, value, v8::Function::New(context, js_set_security_token, exports, 2, v8::ConstructorBehavior::kThrow));
        JS_EXECUTE_IGNORE(NOTHING, exports->DefineOwnProperty(context, name, value, JS_PROPERTY_ATTRIBUTE_FROZEN));
    }
    {
        JS_EXECUTE_RETURN_HANDLE(NOTHING, v8::String, name, ToString(context, "useDefaultSecurityToken"));
        JS_EXECUTE_RETURN_HANDLE(NOTHING, v8::Function, value, v8::Function::New(context, js_use_default_security_token, exports, 1, v8::ConstructorBehavior::kThrow));
        JS_EXECUTE_IGNORE(NOTHING, exports->DefineOwnProperty(context, name, value, JS_PROPERTY_ATTRIBUTE_FROZEN));
    }
    {
        JS_EXECUTE_RETURN_HANDLE(NOTHING, v8::String, name, ToString(context, "nativeFunction"));
        JS_EXECUTE_RETURN_HANDLE(NOTHING, v8::Function, value, v8::Function::New(context, js_platform_native_function, exports, 4, v8::ConstructorBehavior::kThrow));
        JS_EXECUTE_IGNORE(NOTHING, exports->DefineOwnProperty(context, name, value, JS_PROPERTY_ATTRIBUTE_FROZEN));
    }
    {
        JS_EXECUTE_RETURN_HANDLE(NOTHING, v8::String, name, ToString(context, "defineLazyProperty"));
        JS_EXECUTE_RETURN_HANDLE(NOTHING, v8::Function, value, v8::Function::New(context, js_platform_lazy_data_property, exports, 5, v8::ConstructorBehavior::kThrow));
        JS_EXECUTE_IGNORE(NOTHING, exports->DefineOwnProperty(context, name, value, JS_PROPERTY_ATTRIBUTE_FROZEN));
    }
    {
        JS_EXECUTE_RETURN_HANDLE(NOTHING, v8::String, name, ToString(context, "getCreationContextGlobal"));
        JS_EXECUTE_RETURN_HANDLE(NOTHING, v8::Function, value, v8::Function::New(context, js_get_creation_context_global, exports, 1, v8::ConstructorBehavior::kThrow));
        JS_EXECUTE_IGNORE(NOTHING, exports->DefineOwnProperty(context, name, value, JS_PROPERTY_ATTRIBUTE_FROZEN));
    }
}
