import environ
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.django import DjangoInstrumentor
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor


def configure_opentelemetry():
    config = environ.Env()
    axiom_token = config("AXIOM_TOKEN")
    env = config("ENV")

    resource = Resource(attributes={"service.name": f"mainframe-{env}"})
    trace.set_tracer_provider(TracerProvider(resource=resource))
    otlp_exporter = OTLPSpanExporter(
        endpoint="https://api.axiom.co/v1/traces",
        headers={
            "Authorization": f"Bearer {axiom_token}",
            "X-Axiom-Dataset": "mainframe",
        },
    )
    span_processor = BatchSpanProcessor(otlp_exporter)
    trace.get_tracer_provider().add_span_processor(span_processor)
    DjangoInstrumentor().instrument()
