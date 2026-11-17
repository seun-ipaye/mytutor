"""The op vocabulary, validated server-side so a bad model line never reaches the board."""
from typing import Annotated, Literal, Optional, Union

from pydantic import BaseModel, Field, TypeAdapter, ValidationError


class ListNew(BaseModel):
    op: Literal["list_new"]; list: str; head: Optional[bool] = None
class Insert(BaseModel):
    op: Literal["insert"]; list: str; id: str; label: str; index: Optional[int] = None
class Remove(BaseModel):
    op: Literal["remove"]; list: str; id: str
class Reverse(BaseModel):
    op: Literal["reverse"]; list: str
class Connect(BaseModel):
    op: Literal["connect"]; id: str; to: str
    from_: str = Field(alias="from")
class Label(BaseModel):
    op: Literal["label"]; id: str; target: str; text: str
class Highlight(BaseModel):
    op: Literal["highlight"]; id: str; target: str
class Write(BaseModel):
    op: Literal["write"]; id: str; text: str; at: Optional[Literal["title", "note"]] = None
class Erase(BaseModel):
    op: Literal["erase"]; id: str
class Clear(BaseModel):
    op: Literal["clear"]


Op = Annotated[Union[ListNew, Insert, Remove, Reverse, Connect, Label, Highlight, Write, Erase, Clear], Field(discriminator="op")]
_op = TypeAdapter(Op)


def clean_beat(raw) -> list | None:
    """Keep strings and valid ops; drop anything malformed. None if nothing usable."""
    if not isinstance(raw, list):
        return None
    out: list = []
    for part in raw:
        if isinstance(part, str):
            out.append(part)
            continue
        try:
            if isinstance(part, dict) and isinstance(part.get("label"), (int, float)):
                part = {**part, "label": str(part["label"])}
            out.append(_op.validate_python(part).model_dump(by_alias=True, exclude_none=True))
        except ValidationError as e:
            print(f"[tutor] dropped op {part}: {e.errors()[0]['msg']}", flush=True)
    return out if any(isinstance(p, str) and p.strip() for p in out) else None
