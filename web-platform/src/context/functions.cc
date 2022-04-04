#include <node.h>
#include <v8.h>
#include "../js-helper.h"

v8::MaybeLocal<v8::Object> create_interceptor_context(v8::Local<v8::Context> js_context, const v8::FunctionCallbackInfo<v8::Value> &info) {
    auto isolate = js_context->GetIsolate();
    auto factory_options = info.Data().As<v8::Object>();
    JS_OBJECT_STRING_GET(JS_NOTHING(v8::Object), v8::Function, factory_context_prototype, js_context, factory_options, "context");
    v8::Local<v8::Value> prototype;
    if (factory_context_prototype->IsObject()) {
        prototype = factory_context_prototype;
    } else {
        prototype = v8::Null(isolate);
    }
    JS_EXECUTE_RETURN_HANDLE(JS_NOTHING(v8::Object), v8::String, name_this, ToString(js_context, "this"));
    JS_EXECUTE_RETURN_HANDLE(JS_NOTHING(v8::Object), v8::String, name_arguments, ToString(js_context, "arguments"));
    JS_EXECUTE_RETURN_HANDLE(JS_NOTHING(v8::Object), v8::String, name_new_target, ToString(js_context, "newTarget"));
    v8::Local<v8::Name> keys[] = { name_this, name_arguments, name_new_target };
    JS_COPY_ARGUMENTS(arguments, info, 0, info.Length());
    auto array_arguments = v8::Array::New(isolate, arguments, info.Length());
    v8::Local<v8::Value> values[] = { info.This(), array_arguments, info.NewTarget() };
    return v8::Object::New(isolate, prototype, keys, values, 3);
}

void js_native_function_direct(const v8::FunctionCallbackInfo<v8::Value> &info) {
    auto isolate = info.GetIsolate();
    v8::HandleScope scope(isolate);
    auto current_context = isolate->GetCurrentContext();
    auto factory_options = info.Data().As<v8::Object>();

    JS_OBJECT_STRING_GET(NOTHING, v8::Object, platform, current_context, factory_options, "platform");
    JS_EXECUTE_RETURN_HANDLE(NOTHING, v8::Context, js_context_platform, platform->GetCreationContext());

    JS_OBJECT_STRING_GET(NOTHING, v8::Function, implementation, js_context_platform, factory_options, "implementation");

    JS_COPY_ARGUMENTS(arguments, info, 0, info.Length());
    JS_EXECUTE_RETURN_HANDLE(NOTHING, v8::Value, implementation_result, implementation->Call(js_context_platform, info.This(), info.Length(), arguments));

    info.GetReturnValue().Set(implementation_result);
}

void js_native_function_call_before_after(v8::Local<v8::Context> js_context_platform, v8::Local<v8::Object> platform, v8::Local<v8::Function> implementation, v8::Local<v8::Object> options, v8::Local<v8::Object> interceptor_context, v8::ReturnValue<v8::Value> &return_value) {
    auto isolate = js_context_platform->GetIsolate();
    auto undefined = v8::Undefined(isolate);
    JS_OBJECT_STRING_GET(NOTHING, v8::Value, value_before, js_context_platform, options, "before");
    if (value_before->IsFunction()) {
        auto fn_before = value_before.As<v8::Function>();
        v8::Local<v8::Value> arguments[] = { interceptor_context, platform };
        JS_EXECUTE_IGNORE_HANDLE(NOTHING, fn_before->Call(js_context_platform, undefined, 2, arguments));
    }
    JS_OBJECT_STRING_GET(NOTHING, v8::Value, call_this, js_context_platform, interceptor_context, "this");
    JS_OBJECT_STRING_GET(NOTHING, v8::Array, call_arguments, js_context_platform, interceptor_context, "arguments");
    v8::Local<v8::Value> arguments_implementation[call_arguments->Length()];
    for (uint32_t i = 0; i < call_arguments->Length(); ++i) {
        JS_EXECUTE_RETURN_HANDLE(NOTHING, v8::Value, value, call_arguments->Get(js_context_platform, i));
        arguments_implementation[i] = value;
    }
    JS_EXECUTE_RETURN_HANDLE(NOTHING, v8::Value, result_implementation, implementation->Call(js_context_platform, call_this, call_arguments->Length(), arguments_implementation));

    JS_OBJECT_STRING_GET(NOTHING, v8::Value, value_after, js_context_platform, options, "after");
    if (value_after->IsFunction()) {
        auto fn_after = value_after.As<v8::Function>();
        v8::Local<v8::Value> arguments_after[] = { result_implementation, interceptor_context, platform };
        JS_EXECUTE_RETURN_HANDLE(NOTHING, v8::Value, result_after, fn_after->Call(js_context_platform, undefined, 3, arguments_after));
        return_value.Set(result_after);
    } else {
        return_value.Set(result_implementation);
    }
}

void js_native_function_before_after(const v8::FunctionCallbackInfo<v8::Value> &info) {
    auto isolate = info.GetIsolate();
    v8::HandleScope scope(isolate);
    auto js_context_public = isolate->GetCurrentContext();
    auto options = info.Data().As<v8::Object>();

    JS_OBJECT_STRING_GET(NOTHING, v8::Object, platform, js_context_public, options, "platform");
    JS_EXECUTE_RETURN_HANDLE(NOTHING, v8::Context, js_context_platform, platform->GetCreationContext());

    JS_OBJECT_STRING_GET(NOTHING, v8::Function, implementation, js_context_platform, options, "implementation");
    JS_EXECUTE_RETURN_HANDLE(NOTHING, v8::Object, interceptor_context, create_interceptor_context(js_context_platform, info));

    auto return_value = info.GetReturnValue();
    js_native_function_call_before_after(js_context_platform, platform, implementation, options, interceptor_context, return_value);
}

void js_native_function_before_after_catch_finally(const v8::FunctionCallbackInfo<v8::Value> &info) {
    auto isolate = info.GetIsolate();
    v8::HandleScope scope(isolate);
    auto js_context_public = isolate->GetCurrentContext();
    auto undefined = v8::Undefined(isolate);
    auto options = info.Data().As<v8::Object>();

    JS_OBJECT_STRING_GET(NOTHING, v8::Object, platform, js_context_public, options, "platform");
    JS_EXECUTE_RETURN_HANDLE(NOTHING, v8::Context, js_context_platform, platform->GetCreationContext());

    JS_OBJECT_STRING_GET(NOTHING, v8::Function, implementation, js_context_platform, options, "implementation");
    JS_EXECUTE_RETURN_HANDLE(NOTHING, v8::Object, interceptor_context, create_interceptor_context(js_context_platform, info));

    auto return_value = info.GetReturnValue();

    v8::Local<v8::Value> exception;
    {
        v8::TryCatch tryCatch(isolate);
        js_native_function_call_before_after(js_context_platform, platform, implementation, options, interceptor_context, return_value);
        if (!tryCatch.HasCaught()) {
            goto do_finally;
        }
        if (!tryCatch.CanContinue() || tryCatch.HasTerminated()) {
            return;
        }
        exception = tryCatch.Exception();
    }
    {
        JS_OBJECT_STRING_GET(NOTHING, v8::Value, value_catch, js_context_platform, options, "catch");
        if (value_catch->IsFunction()) {
            v8::TryCatch tryCatch(isolate);
            auto fn_catch = value_catch.As<v8::Function>();
            v8::Local<v8::Value> arguments[] = { exception, interceptor_context, platform };
            v8::MaybeLocal<v8::Value> new_exception_value = fn_catch->Call(js_context_platform, undefined, 3, arguments);
            if (!new_exception_value.IsEmpty()) {
                // Valid return result implies that exception is not caught. Function calls that throw exception return no value (not even undefined).
                exception = new_exception_value.ToLocalChecked();
                goto do_finally;
            }
            if (!tryCatch.HasCaught() || !tryCatch.CanContinue() || tryCatch.HasTerminated()) {
                return;
            }
            // Exception thrown in the "catch" listener will replace any exception that has been thrown.
            // This makes a catch like:
            // function (exception) { return new OtherException(exception); }
            // and
            // function (exception) { throw new OtherException(exception); }
            // logically equivalent, although the single-to-multiple-callbacks callback will not catch the exception,
            // so no further callbacks will be called. This should be considered implementation detail, as throw-catch
            // is significantly slower than return. Avoid!
            exception = tryCatch.Exception();
        }
    }

do_finally:
    {
        JS_OBJECT_STRING_GET(NOTHING, v8::Value, value_finally, js_context_platform, options, "finally");
        if (value_finally->IsFunction()) {
            auto fn_finally = value_finally.As<v8::Function>();
            v8::Local<v8::Value> arguments[] = { interceptor_context, platform };
            JS_EXECUTE_IGNORE_HANDLE(NOTHING, fn_finally->Call(js_context_platform, undefined, 2, arguments));
        }
        if (!exception.IsEmpty()) {
            isolate->ThrowException(exception);
        }
    }
}

void js_create_native_function(const v8::FunctionCallbackInfo<v8::Value> &info) {
    auto isolate = info.GetIsolate();
    v8::HandleScope scope(isolate);
    auto js_context = isolate->GetCurrentContext();
    auto options = info[0].As<v8::Object>();
    v8::FunctionCallback callee;
    JS_OBJECT_STRING_GET(NOTHING, v8::Value, value_before, js_context, options, "before");
    JS_OBJECT_STRING_GET(NOTHING, v8::Value, value_after, js_context, options, "after");
    JS_OBJECT_STRING_GET(NOTHING, v8::Value, value_catch, js_context, options, "catch");
    JS_OBJECT_STRING_GET(NOTHING, v8::Value, value_finally, js_context, options, "finally");
    if (value_catch->IsFunction() || value_finally->IsFunction()) {
        callee = js_native_function_before_after_catch_finally;
    } else if (value_before->IsFunction() || value_after->IsFunction()) {
        callee = js_native_function_before_after;
    } else {
        callee = js_native_function_direct;
    }
    JS_OBJECT_STRING_GET(NOTHING, v8::Object, platform, js_context, options, "platform");
    JS_OBJECT_STRING_GET(NOTHING, v8::Object, platform_global, js_context, platform, "global");
    JS_EXECUTE_RETURN_HANDLE(NOTHING, v8::Context, js_context_public, platform_global->GetCreationContext());
    JS_OBJECT_STRING_GET(NOTHING, v8::Value, value_name, js_context, options, "name");
    JS_OBJECT_STRING_GET(NOTHING, v8::Value, value_length, js_context, options, "length");
    JS_OBJECT_STRING_GET(NOTHING, v8::Value, value_allow_new, js_context, options, "allowNew");
    v8::ConstructorBehavior behavior = value_allow_new->BooleanValue(isolate) ? v8::ConstructorBehavior::kAllow : v8::ConstructorBehavior::kThrow;
    int length = 0;
    if (value_length->IsInt32()) {
        JS_EXECUTE_RETURN(NOTHING, int32_t, int_length, value_length->Int32Value(js_context));
        if (int_length > 0) {
            length = int_length;
        }
    }
    JS_EXECUTE_RETURN_HANDLE(NOTHING, v8::Function, fn, v8::Function::New(js_context_public, callee, options, length, behavior));
    if (value_name->IsString()) {
        fn->SetName(value_name.As<v8::String>());
    }
    info.GetReturnValue().Set(fn);
}

void js_lazy_data_property_getter(v8::Local<v8::Name> property, const v8::PropertyCallbackInfo<v8::Value> &info) {
    auto isolate = info.GetIsolate();
    v8::HandleScope scope(isolate);
    auto undefined = v8::Undefined(isolate);
    auto js_context = isolate->GetCurrentContext();
    auto options = info.Data().As<v8::Object>();

    JS_OBJECT_STRING_GET(NOTHING, v8::Object, platform, js_context, options, "platform");
    JS_OBJECT_STRING_GET(NOTHING, v8::Function, getter, js_context, options, "getter");
    JS_OBJECT_STRING_GET(NOTHING, v8::Object, receiver, js_context, options, "receiver");
    JS_EXECUTE_RETURN_HANDLE(NOTHING, v8::Context, js_getter_context, getter->GetCreationContext());

    v8::Local<v8::Value> getter_arguments[] = { receiver, property, platform };
    JS_EXECUTE_RETURN_HANDLE(NOTHING, v8::Value, data, getter->Call(js_getter_context, info.This(), 3, getter_arguments));
    info.GetReturnValue().Set(data);
}

void js_create_lazy_data_property(const v8::FunctionCallbackInfo<v8::Value> &info) {
    auto isolate = info.GetIsolate();
    v8::HandleScope scope(isolate);
    auto js_context = isolate->GetCurrentContext();
    auto options = info[0].As<v8::Object>();

    JS_OBJECT_STRING_GET(NOTHING, v8::Object, receiver, js_context, options, "receiver");
    JS_OBJECT_STRING_GET(NOTHING, v8::Name, name, js_context, options, "name");
    JS_OBJECT_STRING_GET(NOTHING, v8::Object, platform, js_context, options, "platform");
    JS_OBJECT_STRING_GET(NOTHING, v8::Object, global, js_context, platform, "global");
    JS_OBJECT_STRING_GET(NOTHING, v8::Object, value_configurable, js_context, options, "configurable");
    JS_OBJECT_STRING_GET(NOTHING, v8::Object, value_enumerable, js_context, options, "enumerable");
    JS_OBJECT_STRING_GET(NOTHING, v8::Object, value_writable, js_context, options, "writable");
    JS_EXECUTE_RETURN_HANDLE(NOTHING, v8::Context, js_platform_context, global->GetCreationContext());

    v8::PropertyAttribute attributes = v8::PropertyAttribute::None;
    if (!value_configurable->BooleanValue(isolate)) {
        attributes = static_cast<v8::PropertyAttribute>(attributes | v8::PropertyAttribute::DontDelete);
    }
    if (!value_enumerable->BooleanValue(isolate)) {
        attributes = static_cast<v8::PropertyAttribute>(attributes | v8::PropertyAttribute::DontEnum);
    }
    if (!value_writable->BooleanValue(isolate)) {
        attributes = static_cast<v8::PropertyAttribute>(attributes | v8::PropertyAttribute::ReadOnly);
    }

    JS_EXECUTE_IGNORE(NOTHING, receiver->SetLazyDataProperty(js_platform_context, name, js_lazy_data_property_getter, info[0], attributes));
    info.GetReturnValue().Set(info.This());
}

NODE_MODULE_INIT() {
    {
        JS_EXECUTE_RETURN_HANDLE(NOTHING, v8::String, name, ToString(context, "createNativeFunction"));
        JS_EXECUTE_RETURN_HANDLE(NOTHING, v8::Function, value, v8::Function::New(context, js_create_native_function, exports, 1, v8::ConstructorBehavior::kThrow));
        JS_EXECUTE_IGNORE(NOTHING, exports->DefineOwnProperty(context, name, value, JS_PROPERTY_ATTRIBUTE_FROZEN));
    }
    {
        JS_EXECUTE_RETURN_HANDLE(NOTHING, v8::String, name, ToString(context, "createLazyDataProperty"));
        JS_EXECUTE_RETURN_HANDLE(NOTHING, v8::Function, value, v8::Function::New(context, js_create_lazy_data_property, exports, 1, v8::ConstructorBehavior::kThrow));
        JS_EXECUTE_IGNORE(NOTHING, exports->DefineOwnProperty(context, name, value, JS_PROPERTY_ATTRIBUTE_FROZEN));
    }
}