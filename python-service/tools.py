import base64
import io
import json
from typing import Any, Dict, List, Optional

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import plotly.express as px
import plotly.io as pio
import seaborn as sns


PLOTLY_THEME_MAP = {
    "minimal": "plotly_white",
    "bold": "plotly_dark",
    "corporate": "ggplot2",
}

# Darker palette for charts on white/light background (better visibility)
VIZ_PALETTE_LIGHT_BG = [
    "#1e3a5f",  # deep vizard blue
    "#0d9488",  # insight teal
    "#c2410c",  # dark orange
    "#475569",  # slate gray
    "#1d4ed8",  # medium blue
    "#0f766e",  # dark teal
]


def decode_csv_base64(csv_base64: str) -> pd.DataFrame:
    csv_bytes = base64.b64decode(csv_base64)
    csv_str = csv_bytes.decode("utf-8")
    return pd.read_csv(io.StringIO(csv_str))


def encode_csv_base64(df: pd.DataFrame) -> str:
    buffer = io.StringIO()
    df.to_csv(buffer, index=False)
    return base64.b64encode(buffer.getvalue().encode("utf-8")).decode("utf-8")


def inspect_dataframe(df: pd.DataFrame) -> Dict[str, Any]:
    schema: List[Dict[str, Any]] = []
    for col in df.columns:
        dtype = str(df[col].dtype)
        non_null = int(df[col].notnull().sum())
        unique = int(df[col].nunique())
        schema.append({"name": col, "dtype": dtype, "non_null": non_null, "unique": unique})

    sample = df.head(10).to_dict(orient="records")

    numeric_cols = df.select_dtypes(include=[np.number]).columns
    stats: Dict[str, Any] = {}
    if len(numeric_cols) > 0:
        desc = df[numeric_cols].describe().to_dict()
        stats = {
            col: {k: float(v) for k, v in col_stats.items()}
            for col, col_stats in desc.items()
        }

    return {"schema": schema, "sample": sample, "stats": stats}


def basic_clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = [str(c).strip() for c in df.columns]
    df = df.dropna(axis=0, how="all")

    numeric_cols = df.select_dtypes(include=[np.number]).columns
    for col in numeric_cols:
        if df[col].isnull().any():
            df[col] = df[col].fillna(df[col].mean())

    non_numeric_cols = df.select_dtypes(exclude=[np.number]).columns
    for col in non_numeric_cols:
        if df[col].isnull().any():
            mode_series = df[col].mode()
            if not mode_series.empty:
                df[col] = df[col].fillna(mode_series.iloc[0])

    return df


def _pick_default_columns(df: pd.DataFrame) -> Dict[str, Optional[str]]:
    numeric_cols = list(df.select_dtypes(include=[np.number]).columns)
    non_numeric_cols = [c for c in df.columns if c not in numeric_cols]

    if numeric_cols and non_numeric_cols:
        return {"x": non_numeric_cols[0], "y": numeric_cols[0]}
    if len(numeric_cols) >= 2:
        return {"x": numeric_cols[0], "y": numeric_cols[1]}
    if numeric_cols:
        return {"x": None, "y": numeric_cols[0]}
    return {"x": None, "y": None}


# ---------------------------------------------------------------------------
# Static visualization (matplotlib/seaborn) -> PNG or PDF base64
# ---------------------------------------------------------------------------


def create_static_viz_image(
    df: pd.DataFrame,
    viz_type: str,
    x: Optional[str] = None,
    y: Optional[str] = None,
    aggregate: Optional[str] = None,
    theme: Optional[str] = "minimal",
    options: Optional[Dict[str, Any]] = None,
    output_format: str = "png",
) -> str:
    if options is None:
        options = {}

    defaults = _pick_default_columns(df)
    if x is None:
        x = defaults["x"]
    if y is None:
        y = defaults["y"]

    # White background with darker palette for visibility on light UI
    sns.set_theme(style="whitegrid", palette=VIZ_PALETTE_LIGHT_BG)
    fig, ax = plt.subplots(figsize=(8, 5), dpi=120)
    fig.patch.set_facecolor("white")
    ax.set_facecolor("white")

    if viz_type == "bar" and x and y:
        if aggregate in {"sum", "mean", "avg"}:
            agg_func = "sum" if aggregate == "sum" else "mean"
            data = df.groupby(x)[y].agg(agg_func).reset_index()
            sns.barplot(data=data, x=x, y=y, ax=ax)
        else:
            sns.barplot(data=df, x=x, y=y, ax=ax)
    elif viz_type == "line" and x and y:
        sns.lineplot(data=df, x=x, y=y, ax=ax, marker="o")
    elif viz_type == "scatter" and x and y:
        sns.scatterplot(data=df, x=x, y=y, ax=ax, s=60, edgecolor="#334155", linewidth=0.6)
    elif viz_type == "histogram" and y:
        sns.histplot(data=df, x=y, ax=ax, kde=True)
    else:
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        if len(numeric_cols) > 0:
            sns.histplot(data=df, x=numeric_cols[0], ax=ax, kde=True)
            ax.set_title(f"Distribution of {numeric_cols[0]}")
        else:
            df["__row__"] = 1
            sns.barplot(
                data=df.reset_index().groupby("index")["__row__"].sum().reset_index(),
                x="index",
                y="__row__",
                ax=ax,
            )
            ax.set_title("Row counts")

    ax.set_xlabel(x if x is not None else "")
    if y is not None:
        ax.set_ylabel(y)

    plt.tight_layout()
    buffer = io.BytesIO()
    fmt = "pdf" if output_format == "pdf" else "png"
    fig.savefig(buffer, format=fmt, bbox_inches="tight")
    plt.close(fig)

    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode("utf-8")


# ---------------------------------------------------------------------------
# Dynamic visualization (Plotly) -> self-contained HTML string
# ---------------------------------------------------------------------------


def _plotly_template(theme: Optional[str]) -> str:
    return PLOTLY_THEME_MAP.get(theme or "minimal", "plotly_white")


def create_dynamic_viz_html(
    df: pd.DataFrame,
    viz_type: str,
    x: Optional[str] = None,
    y: Optional[str] = None,
    aggregate: Optional[str] = None,
    theme: Optional[str] = "minimal",
    options: Optional[Dict[str, Any]] = None,
) -> str:
    if options is None:
        options = {}

    defaults = _pick_default_columns(df)
    if x is None:
        x = defaults["x"]
    if y is None:
        y = defaults["y"]

    template = "plotly_white"
    color_col = options.get("color")

    if viz_type == "choropleth":
        return _create_choropleth_html(df, x, y, theme, options)

    working_df = df
    if aggregate in {"sum", "mean", "avg"} and x and y:
        agg_func = "sum" if aggregate == "sum" else "mean"
        working_df = df.groupby(x)[y].agg(agg_func).reset_index()

    fig = None
    if viz_type == "bar" and x and y:
        fig = px.bar(working_df, x=x, y=y, color=color_col, template=template, color_discrete_sequence=VIZ_PALETTE_LIGHT_BG)
    elif viz_type == "line" and x and y:
        fig = px.line(working_df, x=x, y=y, color=color_col, template=template, markers=True, color_discrete_sequence=VIZ_PALETTE_LIGHT_BG)
    elif viz_type == "scatter" and x and y:
        fig = px.scatter(working_df, x=x, y=y, color=color_col, template=template, color_discrete_sequence=VIZ_PALETTE_LIGHT_BG)
    elif viz_type == "histogram" and y:
        fig = px.histogram(working_df, x=y, template=template, marginal="rug", color_discrete_sequence=VIZ_PALETTE_LIGHT_BG)
    else:
        numeric_cols = list(working_df.select_dtypes(include=[np.number]).columns)
        if numeric_cols:
            fig = px.histogram(working_df, x=numeric_cols[0], template=template, marginal="rug", color_discrete_sequence=VIZ_PALETTE_LIGHT_BG)
        else:
            fig = px.bar(working_df, template=template, color_discrete_sequence=VIZ_PALETTE_LIGHT_BG)

    if fig is not None:
        fig.update_layout(
            margin=dict(l=40, r=20, t=40, b=40),
            paper_bgcolor="white",
            plot_bgcolor="white",
            font=dict(color="#334155"),
        )

    html = pio.to_html(fig, full_html=True, include_plotlyjs="cdn")
    return html


# ---------------------------------------------------------------------------
# Choropleth / Map support
# ---------------------------------------------------------------------------


def _create_choropleth_html(
    df: pd.DataFrame,
    location_col: Optional[str],
    value_col: Optional[str],
    theme: Optional[str] = "minimal",
    options: Optional[Dict[str, Any]] = None,
) -> str:
    if options is None:
        options = {}

    if location_col is None or value_col is None:
        cols = list(df.columns)
        non_numeric = [c for c in cols if not np.issubdtype(df[c].dtype, np.number)]
        numeric = [c for c in cols if np.issubdtype(df[c].dtype, np.number)]
        location_col = location_col or (non_numeric[0] if non_numeric else cols[0])
        value_col = value_col or (numeric[0] if numeric else cols[-1])

    scope = options.get("scope", "world")
    locationmode = options.get("locationmode", "country names")

    fig = px.choropleth(
        df,
        locations=location_col,
        locationmode=locationmode,
        color=value_col,
        template="plotly_white",
        scope=scope,
        color_continuous_scale=["#e0f2fe", "#0d9488", "#0f766e", "#134e4a"],
    )
    fig.update_layout(
        margin=dict(l=0, r=0, t=40, b=0),
        paper_bgcolor="white",
        plot_bgcolor="white",
        font=dict(color="#334155"),
    )

    return pio.to_html(fig, full_html=True, include_plotlyjs="cdn")


# ---------------------------------------------------------------------------
# Suggestions helper
# ---------------------------------------------------------------------------


def suggest_visualizations(df: pd.DataFrame) -> List[Dict[str, Any]]:
    suggestions: List[Dict[str, Any]] = []
    numeric_cols = list(df.select_dtypes(include=[np.number]).columns)
    non_numeric_cols = [c for c in df.columns if c not in numeric_cols]

    if numeric_cols and non_numeric_cols:
        suggestions.append({
            "viz_type": "bar",
            "x": non_numeric_cols[0],
            "y": numeric_cols[0],
            "label": f"Bar: {numeric_cols[0]} by {non_numeric_cols[0]}",
        })

    if len(numeric_cols) >= 2:
        suggestions.append({
            "viz_type": "scatter",
            "x": numeric_cols[0],
            "y": numeric_cols[1],
            "label": f"Scatter: {numeric_cols[0]} vs {numeric_cols[1]}",
        })

    for col in numeric_cols[:2]:
        suggestions.append({
            "viz_type": "histogram",
            "x": None,
            "y": col,
            "label": f"Histogram: {col}",
        })

    time_cols = [c for c in df.columns if any(k in c.lower() for k in ("date", "time", "year", "month"))]
    if time_cols and numeric_cols:
        suggestions.append({
            "viz_type": "line",
            "x": time_cols[0],
            "y": numeric_cols[0],
            "label": f"Line: {numeric_cols[0]} over {time_cols[0]}",
        })

    country_keywords = {"country", "nation", "state", "region", "province", "iso", "code"}
    geo_cols = [c for c in non_numeric_cols if any(k in c.lower() for k in country_keywords)]
    if geo_cols and numeric_cols:
        suggestions.append({
            "viz_type": "choropleth",
            "x": geo_cols[0],
            "y": numeric_cols[0],
            "label": f"Map: {numeric_cols[0]} by {geo_cols[0]}",
        })

    return suggestions[:6]
