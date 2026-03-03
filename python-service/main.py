from typing import Any, Dict, List, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from tools import (
    basic_clean_dataframe,
    create_dynamic_viz_html,
    create_static_viz_image,
    decode_csv_base64,
    encode_csv_base64,
    get_chart_data,
    inspect_dataframe,
    suggest_visualizations,
)


class InspectRequest(BaseModel):
    csv_base64: str


class InspectResponse(BaseModel):
    schema: List[Dict[str, Any]]
    sample: List[Dict[str, Any]]
    stats: Dict[str, Any]
    suggestions: List[Dict[str, Any]]


class CleanRequest(BaseModel):
    csv_base64: str
    instructions: Optional[str] = None


class CleanResponse(BaseModel):
    csv_base64: str


class VizOptions(BaseModel):
    viz_type: str
    x: Optional[str] = None
    y: Optional[str] = None
    aggregate: Optional[str] = None
    theme: Optional[str] = "minimal"
    options: Optional[Dict[str, Any]] = None
    prompt: Optional[str] = None


class VizRequest(BaseModel):
    csv_base64: str
    spec: VizOptions
    output_format: Optional[str] = "png"


class VizResponse(BaseModel):
    image_base64: str
    format: str


class DynamicVizRequest(BaseModel):
    csv_base64: str
    spec: VizOptions


class DynamicVizResponse(BaseModel):
    html: str


class ChartDataRequest(BaseModel):
    csv_base64: str
    spec: VizOptions


class ChartDataResponse(BaseModel):
    spec: Dict[str, Any]
    data: List[Dict[str, Any]]
    use_plotly: bool = False


app = FastAPI(title="Vizard.ai Python Viz Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/inspect", response_model=InspectResponse)
def inspect(req: InspectRequest) -> InspectResponse:
    df = decode_csv_base64(req.csv_base64)
    result = inspect_dataframe(df)
    suggestions = suggest_visualizations(df)
    return InspectResponse(**result, suggestions=suggestions)


@app.post("/clean", response_model=CleanResponse)
def clean(req: CleanRequest) -> CleanResponse:
    df = decode_csv_base64(req.csv_base64)
    cleaned = basic_clean_dataframe(df)
    cleaned_base64 = encode_csv_base64(cleaned)
    return CleanResponse(csv_base64=cleaned_base64)


@app.post("/viz", response_model=VizResponse)
def viz(req: VizRequest) -> VizResponse:
    df = decode_csv_base64(req.csv_base64)
    spec = req.spec
    fmt = req.output_format or "png"

    image_base64 = create_static_viz_image(
        df=df,
        viz_type=spec.viz_type,
        x=spec.x,
        y=spec.y,
        aggregate=spec.aggregate,
        theme=spec.theme,
        options=spec.options,
        output_format=fmt,
    )

    return VizResponse(image_base64=image_base64, format=fmt)


@app.post("/dynamic-viz", response_model=DynamicVizResponse)
def dynamic_viz(req: DynamicVizRequest) -> DynamicVizResponse:
    df = decode_csv_base64(req.csv_base64)
    spec = req.spec

    html = create_dynamic_viz_html(
        df=df,
        viz_type=spec.viz_type,
        x=spec.x,
        y=spec.y,
        aggregate=spec.aggregate,
        theme=spec.theme,
        options=spec.options,
    )

    return DynamicVizResponse(html=html)


@app.post("/chart-data", response_model=ChartDataResponse)
def chart_data(req: ChartDataRequest) -> ChartDataResponse:
    df = decode_csv_base64(req.csv_base64)
    spec = req.spec
    result = get_chart_data(
        df=df,
        viz_type=spec.viz_type,
        x=spec.x,
        y=spec.y,
        aggregate=spec.aggregate,
        options=spec.options,
    )
    return ChartDataResponse(
        spec=result["spec"],
        data=result["data"],
        use_plotly=result.get("use_plotly", False),
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
