#include <node.h>
#include <v8.h>
#include "../js-helper.h"

void js_get_security_token(const v8::FunctionCallbackInfo<v8::Value> &info) {
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

void js_set_security_token(const v8::FunctionCallbackInfo<v8::Value> &info) {
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

void js_use_default_security_token(const v8::FunctionCallbackInfo<v8::Value> &info) {
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
}
