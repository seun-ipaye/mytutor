"""The op vocabulary, validated server-side so a bad model line never reaches the board."""
from typing import Annotated, Literal, Optional, Union

from pydantic import BaseModel, ConfigDict, Field, TypeAdapter, ValidationError


class _Op(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class New(_Op):
    op: Literal["new"]; id: str; kind: Literal["list", "array", "stack"]; title: Optional[str] = None
class Add(_Op):
    op: Literal["add"]; id: str; label: str; at: Optional[int] = None
    in_: str = Field(alias="in")
class Remove(_Op):
    op: Literal["remove"]; id: str; list: Optional[str] = None
    in_: Optional[str] = Field(default=None, alias="in")
class Set(_Op):
    op: Literal["set"]; id: str; label: str
class Swap(_Op):
    op: Literal["swap"]; a: str; b: str
    in_: Optional[str] = Field(default=None, alias="in")
class Reverse(_Op):
    op: Literal["reverse"]; list: Optional[str] = None
    in_: Optional[str] = Field(default=None, alias="in")
class Pointer(_Op):
    op: Literal["pointer"]; id: str; target: Optional[str] = None; name: Optional[str] = None
class Link(_Op):
    op: Literal["link", "connect"]; id: str; to: str
    from_: str = Field(alias="from")
class Label(_Op):
    op: Literal["label"]; id: str; target: str; text: str
class Highlight(_Op):
    op: Literal["highlight"]; id: str; target: str
class Write(_Op):
    op: Literal["write"]; id: str; text: str; at: Optional[Literal["title", "note"]] = None
class Erase(_Op):
    op: Literal["erase"]; id: str
class Clear(_Op):
    op: Literal["clear"]
# legacy list-only ops (scripted lesson, older prompts)
class ListNew(_Op):
    op: Literal["list_new"]; list: str; head: Optional[bool] = None
class Insert(_Op):
    op: Literal["insert"]; list: str; id: str; label: str; index: Optional[int] = None


Op = Annotated[
    Union[New, Add, Remove, Set, Swap, Reverse, Pointer, Link, Label, Highlight, Write, Erase, Clear, ListNew, Insert],
    Field(discriminator="op"),
]
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
            dumped = _op.validate_python(part).model_dump(by_alias=True, exclude_none=True)
            if dumped["op"] == "pointer" and "target" not in dumped:
                dumped["target"] = None  # explicit null = remove the marker
            out.append(dumped)
        except ValidationError as e:
            print(f"[tutor] dropped op {part}: {e.errors()[0]['msg']}", flush=True)
    return out if any(isinstance(p, str) and p.strip() for p in out) else None
