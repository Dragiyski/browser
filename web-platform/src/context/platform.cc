#include <v8.h>
#include <node.h>
#include "../js-helper.h"

void js_callback_native_function(const v8::FunctionCallbackInfo<v8::Value> &info) {
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
 * @brief Create a function within the public context, that calls a function within the private context.
 *
 * info[0] = platform;
 * info[1] = function(platform, this, arguments, newTarget);
 * info[2] = name?
 * info[3] = is constructor behavior allowed
 *
 * The returned function will call info[1] when the function is called.
 *
 * @param info
 */
void js_platform_native_function(const v8::FunctionCallbackInfo<v8::Value> &info) {
    auto isolate = info.GetIsolate();
    v8::EscapableHandleScope scope(isolate);
    auto context = isolate->GetCurrentContext();

    auto platform = info[0].As<v8::Object>();
    auto callee = info[1].As<v8::Function>();
    auto name = info[2];
    bool is_constructor = info[3]->BooleanValue(isolate);
    JS_EXECUTE_RETURN(NOTHING, int32_t, length, info[4]->Int32Value(context));

    JS_OBJECT_STRING_GET(NOTHING, v8::Object, global, context, platform, "global");
    JS_EXECUTE_RETURN_HANDLE(NOTHING, v8::Context, context_platform, global->GetCreationContext());

    v8::ConstructorBehavior constructor_behavior = is_constructor ? v8::ConstructorBehavior::kAllow : v8::ConstructorBehavior::kThrow;

    v8::Local<v8::Value> binding_native[] = { platform, callee };
    v8::Local<v8::Array> binding = v8::Array::New(isolate, binding_native, 2);
    JS_EXECUTE_RETURN_HANDLE(NOTHING, v8::Function, native, v8::Function::New(context_platform, js_callback_native_function, binding, length, constructor_behavior));
    info.GetReturnValue().Set(scope.Escape(native));
}
